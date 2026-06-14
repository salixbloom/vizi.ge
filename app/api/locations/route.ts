import { NextRequest, NextResponse } from "next/server";
import { getApprovedLocations, toFeatureCollection } from "@/lib/locations";
import { parseBBox } from "@/lib/geo";

export const dynamic = "force-dynamic";

// GET /api/locations[?bbox=minLng,minLat,maxLng,maxLat] -> GeoJSON FeatureCollection
export function GET(req: NextRequest) {
  const bbox = parseBBox(req.nextUrl.searchParams.get("bbox"));
  const rows = getApprovedLocations(bbox);
  return NextResponse.json(toFeatureCollection(rows));
}
