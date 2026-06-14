import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import fs from "node:fs";
import path from "node:path";
import { db } from "@/lib/db";
import { submissionImages } from "@/lib/schema";

const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR || "./data/uploads");

// GET /api/images/:id[?v=thumb] -> serves a processed image from local disk.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const img = db
    .select()
    .from(submissionImages)
    .where(eq(submissionImages.id, Number(id)))
    .get();
  if (!img) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const wantThumb = req.nextUrl.searchParams.get("v") === "thumb";
  const rel = wantThumb ? img.thumbPath : img.path;

  // Resolve safely inside UPLOAD_DIR to prevent path traversal.
  const abs = path.resolve(UPLOAD_DIR, rel);
  if (!abs.startsWith(UPLOAD_DIR + path.sep)) {
    return NextResponse.json({ error: "bad path" }, { status: 400 });
  }
  if (!fs.existsSync(abs)) {
    return NextResponse.json({ error: "missing file" }, { status: 404 });
  }

  const data = fs.readFileSync(abs);
  return new NextResponse(data, {
    headers: {
      "Content-Type": img.mime,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
