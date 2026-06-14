import { and, eq, gte, lte } from "drizzle-orm";
import { db } from "./db";
import { locations, type Location } from "./schema";
import type { BBox } from "./geo";

/** Approved locations, optionally constrained to a bounding box. */
export function getApprovedLocations(bbox?: BBox | null): Location[] {
  const filters = [eq(locations.status, "approved")];
  if (bbox) {
    const [minLng, minLat, maxLng, maxLat] = bbox;
    filters.push(
      gte(locations.lat, minLat),
      lte(locations.lat, maxLat),
      gte(locations.lng, minLng),
      lte(locations.lng, maxLng),
    );
  }
  return db
    .select()
    .from(locations)
    .where(and(...filters))
    .all();
}

export function getLocation(id: number): Location | undefined {
  return db.select().from(locations).where(eq(locations.id, id)).get();
}

export type LocationFeature = {
  type: "Feature";
  geometry: { type: "Point"; coordinates: [number, number] };
  properties: { id: number; label: string | null };
};

export function toFeatureCollection(rows: Location[]) {
  return {
    type: "FeatureCollection" as const,
    features: rows.map(
      (r): LocationFeature => ({
        type: "Feature",
        geometry: { type: "Point", coordinates: [r.lng, r.lat] },
        properties: { id: r.id, label: r.label },
      }),
    ),
  };
}
