import { NextResponse } from "next/server";
import { getLocation } from "@/lib/locations";

export const dynamic = "force-dynamic";

// GET /api/locations/:id -> location detail (with image URL if present)
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const loc = getLocation(Number(id));
  if (!loc) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  return NextResponse.json({
    id: loc.id,
    lat: loc.lat,
    lng: loc.lng,
    label: loc.label,
    description: loc.description,
    firstSeen: loc.firstSeen,
    imageUrl: loc.currentImageId ? `/api/images/${loc.currentImageId}` : null,
  });
}
