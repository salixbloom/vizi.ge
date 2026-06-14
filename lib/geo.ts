/** Washington State bounding box: [minLng, minLat, maxLng, maxLat]. */
export type BBox = [number, number, number, number];

const DEFAULT_WA_BBOX: BBox = [-124.85, 45.54, -116.91, 49.05];

export function getWaBBox(): BBox {
  const raw = process.env.WA_BBOX;
  if (!raw) return DEFAULT_WA_BBOX;
  const parts = raw.split(",").map((p) => Number(p.trim()));
  if (parts.length === 4 && parts.every((n) => Number.isFinite(n))) {
    return parts as BBox;
  }
  return DEFAULT_WA_BBOX;
}

export function isInWA(lat: number, lng: number): boolean {
  const [minLng, minLat, maxLng, maxLat] = getWaBBox();
  return lat >= minLat && lat <= maxLat && lng >= minLng && lng <= maxLng;
}

/** Parse a "minLng,minLat,maxLng,maxLat" query string into a BBox. */
export function parseBBox(raw: string | null): BBox | null {
  if (!raw) return null;
  const parts = raw.split(",").map((p) => Number(p.trim()));
  if (parts.length === 4 && parts.every((n) => Number.isFinite(n))) {
    return parts as BBox;
  }
  return null;
}
