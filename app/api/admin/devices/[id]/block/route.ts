import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { isAdmin } from "@/lib/session";
import { db } from "@/lib/db";
import { devices } from "@/lib/schema";

export const runtime = "nodejs";

const Body = z.object({ blocked: z.boolean() });

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }
  const res = db
    .update(devices)
    .set({ blocked: parsed.data.blocked })
    .where(eq(devices.deviceId, id))
    .run();
  if (res.changes === 0) {
    return NextResponse.json({ error: "device not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
