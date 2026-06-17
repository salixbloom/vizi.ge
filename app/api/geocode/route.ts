import { NextRequest, NextResponse } from "next/server";
import { getWaBBox } from "@/lib/geo";

// Server-side proxy to the Photon (OpenStreetMap) geocoder. Keeping it server-side
// lets us send a courteous User-Agent, bound results to Washington via WA_BBOX,
// and cache repeat lookups so the public Photon instance isn't hammered by the
// per-keystroke autocomplete in the client search box.

export const dynamic = "force-dynamic";

const PHOTON_URL = "https://photon.komoot.io/api";
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const CACHE_MAX = 200;
const UPSTREAM_TIMEOUT_MS = 4000;

export type GeoResult = { label: string; lng: number; lat: number; kind: string | null };

type PhotonProps = {
  name?: string;
  street?: string;
  housenumber?: string;
  city?: string;
  county?: string;
  state?: string;
  postcode?: string;
  osm_value?: string;
};

// Small LRU-ish cache keyed by the normalized query.
const cache = new Map<string, { ts: number; results: GeoResult[] }>();

function cacheGet(key: string): GeoResult[] | null {
  const hit = cache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.ts > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  cache.delete(key); // refresh recency
  cache.set(key, hit);
  return hit.results;
}

function cacheSet(key: string, results: GeoResult[]) {
  cache.set(key, { ts: Date.now(), results });
  while (cache.size > CACHE_MAX) {
    const oldest = cache.keys().next().value;
    if (oldest === undefined) break;
    cache.delete(oldest);
  }
}

function buildLabel(p: PhotonProps): string {
  const head = p.name || [p.housenumber, p.street].filter(Boolean).join(" ");
  const tail = [p.city || p.county, p.state, p.postcode].filter(Boolean).join(", ");
  return [head, tail].filter(Boolean).join(" · ") || "Unnamed place";
}

// GET /api/geocode?q=<text> -> { results: GeoResult[] }, Washington-bounded.
export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") || "").trim();
  if (q.length < 2) return NextResponse.json({ results: [] });

  const key = q.toLowerCase();
  const cached = cacheGet(key);
  if (cached) return NextResponse.json({ results: cached });

  const [minLng, minLat, maxLng, maxLat] = getWaBBox();
  const url = new URL(PHOTON_URL);
  url.searchParams.set("q", q);
  url.searchParams.set("limit", "6");
  url.searchParams.set("lang", "en");
  // Bias toward, and restrict to, the WA bounding box.
  url.searchParams.set("lat", String((minLat + maxLat) / 2));
  url.searchParams.set("lon", String((minLng + maxLng) / 2));
  url.searchParams.set("bbox", `${minLng},${minLat},${maxLng},${maxLat}`);

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), UPSTREAM_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { "User-Agent": "vizi.ge/0.1 (sightings map; +https://vizi.ge)" },
    });
    if (!res.ok) throw new Error(`photon ${res.status}`);
    const data = (await res.json()) as { features?: Array<{ geometry?: { type?: string; coordinates?: [number, number] }; properties?: PhotonProps }> };

    const results: GeoResult[] = (data.features || [])
      .filter((f) => f?.geometry?.type === "Point" && Array.isArray(f.geometry.coordinates))
      .map((f) => {
        const [lng, lat] = f.geometry!.coordinates!;
        return { label: buildLabel(f.properties || {}), lng, lat, kind: f.properties?.osm_value ?? null };
      })
      // bbox biases results but does not hard-clip in every case — drop strays.
      .filter((r) => r.lng >= minLng && r.lng <= maxLng && r.lat >= minLat && r.lat <= maxLat);

    cacheSet(key, results);
    return NextResponse.json({ results });
  } catch {
    // Degrade gracefully: an empty list keeps the search box usable rather than
    // surfacing an upstream error to the user.
    return NextResponse.json({ results: [], error: "geocoder unavailable" });
  } finally {
    clearTimeout(timer);
  }
}
