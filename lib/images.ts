import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import sharp from "sharp";

export const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR || "./data/uploads");

export const MAX_IMAGE_BYTES = 12 * 1024 * 1024; // 12 MB per file
export const MAX_IMAGES_PER_SUBMISSION = 3;
const FULL_MAX_DIM = 2000;
const THUMB_MAX_DIM = 400;

// Magic-byte signatures for the formats we accept.
const SIGNATURES: { mime: string; test: (b: Buffer) => boolean }[] = [
  { mime: "image/jpeg", test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  {
    mime: "image/png",
    test: (b) =>
      b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47,
  },
  {
    mime: "image/webp",
    test: (b) =>
      b.toString("ascii", 0, 4) === "RIFF" && b.toString("ascii", 8, 12) === "WEBP",
  },
];

export function sniffMime(buf: Buffer): string | null {
  return SIGNATURES.find((s) => s.test(buf))?.mime ?? null;
}

export type StoredImage = {
  path: string; // relative to UPLOAD_DIR
  thumbPath: string;
  mime: string;
  width: number;
  height: number;
};

/**
 * Re-encode an uploaded image with sharp: auto-orient, strip all metadata
 * (incl. EXIF GPS), cap dimensions, and emit a full-size + thumbnail WebP.
 * Re-encoding also neutralizes any payload smuggled in the original file.
 */
export async function processAndStore(buf: Buffer): Promise<StoredImage> {
  const mime = sniffMime(buf);
  if (!mime) throw new Error("unsupported image type");

  const subdir = new Date().toISOString().slice(0, 7); // YYYY-MM
  const dir = path.join(UPLOAD_DIR, subdir);
  fs.mkdirSync(dir, { recursive: true });

  const base = randomUUID();
  const fullRel = path.join(subdir, `${base}.webp`);
  const thumbRel = path.join(subdir, `${base}.thumb.webp`);

  const pipeline = sharp(buf, { failOn: "error" }).rotate(); // auto-orient, drops EXIF

  const full = await pipeline
    .clone()
    .resize(FULL_MAX_DIM, FULL_MAX_DIM, { fit: "inside", withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer({ resolveWithObject: true });

  await pipeline
    .clone()
    .resize(THUMB_MAX_DIM, THUMB_MAX_DIM, { fit: "inside", withoutEnlargement: true })
    .webp({ quality: 75 })
    .toFile(path.join(UPLOAD_DIR, thumbRel));

  fs.writeFileSync(path.join(UPLOAD_DIR, fullRel), full.data);

  return {
    path: fullRel,
    thumbPath: thumbRel,
    mime: "image/webp",
    width: full.info.width,
    height: full.info.height,
  };
}
