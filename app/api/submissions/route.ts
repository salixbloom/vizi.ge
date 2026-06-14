import { NextRequest, NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { devices, submissionImages, submissions } from "@/lib/schema";
import { getQuota } from "@/lib/rate-limit";
import { isInWA } from "@/lib/geo";
import {
  MAX_IMAGES_PER_SUBMISSION,
  MAX_IMAGE_BYTES,
  processAndStore,
  type StoredImage,
} from "@/lib/images";

export const runtime = "nodejs";

const FieldsSchema = z.object({
  type: z.enum(["new", "update"]),
  targetLocationId: z.coerce.number().int().positive().optional(),
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  note: z.string().max(1000).optional(),
  deviceId: z.string().min(16).max(128),
});

function hashIp(req: NextRequest): string {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";
  const salt = process.env.SESSION_SECRET || "vizi-salt";
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex").slice(0, 32);
}

export async function POST(req: NextRequest) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "expected multipart/form-data" }, { status: 400 });
  }

  const parsed = FieldsSchema.safeParse({
    type: form.get("type"),
    targetLocationId: form.get("targetLocationId") || undefined,
    lat: form.get("lat"),
    lng: form.get("lng"),
    note: form.get("note") || undefined,
    deviceId: form.get("deviceId"),
  });
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid fields", details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const fields = parsed.data;

  if (fields.type === "update" && !fields.targetLocationId) {
    return NextResponse.json(
      { error: "targetLocationId required for updates" },
      { status: 400 },
    );
  }

  if (!isInWA(fields.lat, fields.lng)) {
    return NextResponse.json(
      { error: "location is outside Washington State" },
      { status: 400 },
    );
  }

  // Blocked-device check.
  const device = db
    .select()
    .from(devices)
    .where(eq(devices.deviceId, fields.deviceId))
    .get();
  if (device?.blocked) {
    return NextResponse.json({ error: "device blocked" }, { status: 403 });
  }

  // Daily rate limit.
  const quota = getQuota(fields.deviceId);
  if (quota.remaining <= 0) {
    return NextResponse.json(
      { error: "daily submission limit reached", quota },
      { status: 429 },
    );
  }

  // Collect + validate image files.
  const files = form.getAll("images").filter((f): f is File => f instanceof File);
  if (files.length === 0) {
    return NextResponse.json({ error: "at least one photo is required" }, { status: 400 });
  }
  if (files.length > MAX_IMAGES_PER_SUBMISSION) {
    return NextResponse.json(
      { error: `at most ${MAX_IMAGES_PER_SUBMISSION} photos` },
      { status: 400 },
    );
  }
  for (const f of files) {
    if (f.size > MAX_IMAGE_BYTES) {
      return NextResponse.json({ error: "photo too large (max 12MB)" }, { status: 400 });
    }
  }

  // Process images before touching the DB so a bad file fails cleanly.
  const stored: StoredImage[] = [];
  for (const f of files) {
    const buf = Buffer.from(await f.arrayBuffer());
    try {
      stored.push(await processAndStore(buf));
    } catch {
      return NextResponse.json({ error: "could not process photo" }, { status: 400 });
    }
  }

  const ipHash = hashIp(req);
  const now = new Date().toISOString().replace("T", " ").slice(0, 19);

  const result = db.transaction((tx) => {
    const inserted = tx
      .insert(submissions)
      .values({
        type: fields.type,
        targetLocationId: fields.targetLocationId ?? null,
        lat: fields.lat,
        lng: fields.lng,
        note: fields.note ?? null,
        deviceId: fields.deviceId,
        ipHash,
        status: "pending",
      })
      .returning({ id: submissions.id })
      .get();

    for (const img of stored) {
      tx.insert(submissionImages).values({
        submissionId: inserted.id,
        path: img.path,
        thumbPath: img.thumbPath,
        mime: img.mime,
        width: img.width,
        height: img.height,
      }).run();
    }

    // Upsert device tracking.
    tx.insert(devices)
      .values({ deviceId: fields.deviceId, lastSeen: now, submissionCount: 1 })
      .onConflictDoUpdate({
        target: devices.deviceId,
        set: {
          lastSeen: now,
          submissionCount: sql`${devices.submissionCount} + 1`,
        },
      })
      .run();

    return inserted.id;
  });

  return NextResponse.json({
    ok: true,
    submissionId: result,
    quota: getQuota(fields.deviceId),
  });
}
