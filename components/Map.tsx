"use client";

import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef, useState } from "react";
import SearchBox, { type GeoResult } from "./SearchBox";

// Raster layer/source id, kept in sync with public/map-style.json.
const RASTER_LAYER_ID = "wa-rasters";

// Center on Washington State.
const WA_CENTER: [number, number] = [-120.74, 47.4];
const WA_ZOOM = 6;

// Allow pointing MapLibre straight at a light-maps style endpoint instead of the
// bundled raster style (e.g. NEXT_PUBLIC_MAP_STYLE_URL=/tiles/style.json).
const STYLE_URL = process.env.NEXT_PUBLIC_MAP_STYLE_URL || "/map-style.json";

async function loadDetailHtml(id: number): Promise<string> {
  try {
    const res = await fetch(`/api/locations/${id}`);
    if (!res.ok) return "<strong>Sighting</strong>";
    const d = await res.json();
    const img = d.imageUrl
      ? `<img src="${d.imageUrl}?v=thumb" alt="" style="width:100%;border-radius:6px;margin-top:6px" />`
      : "";
    return `
      <strong>${escapeHtml(d.label || "Sighting")}</strong>
      ${d.firstSeen ? `<div style="opacity:.7;font-size:12px">first seen ${escapeHtml(d.firstSeen)}</div>` : ""}
      ${d.description ? `<p style="margin:6px 0 0">${escapeHtml(d.description)}</p>` : ""}
      ${img}
    `;
  } catch {
    return "<strong>Sighting</strong>";
  }
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );
}

export default function Map() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const searchMarkerRef = useRef<maplibregl.Marker | null>(null);
  const [rasterVisible, setRasterVisible] = useState(true);

  useEffect(() => {
    if (!containerRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: STYLE_URL,
      center: WA_CENTER,
      zoom: WA_ZOOM,
      // Vector tiles are fetched inside a Web Worker, whose blob: origin can't
      // resolve a root-relative URL like "/tiles/...". Absolutize it so the
      // worker's fetch() succeeds, while keeping the style file deploy-agnostic.
      transformRequest: (url) => ({
        url: url.startsWith("/") ? window.location.origin + url : url,
      }),
    });
    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl(), "top-right");

    map.on("load", async () => {
      map.addSource("sightings", {
        type: "geojson",
        data: "/api/locations",
        cluster: true,
        clusterRadius: 50,
      });

      map.addLayer({
        id: "clusters",
        type: "circle",
        source: "sightings",
        filter: ["has", "point_count"],
        paint: {
          "circle-color": "#e0245e",
          "circle-opacity": 0.85,
          "circle-radius": ["step", ["get", "point_count"], 16, 10, 22, 50, 30],
        },
      });

      map.addLayer({
        id: "unclustered",
        type: "circle",
        source: "sightings",
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-color": "#e0245e",
          "circle-radius": 8,
          "circle-stroke-width": 2,
          "circle-stroke-color": "#fff",
        },
      });

      // Click a cluster to zoom into it.
      map.on("click", "clusters", async (e) => {
        const feature = e.features?.[0];
        if (!feature) return;
        const clusterId = feature.properties?.cluster_id;
        const src = map.getSource("sightings") as maplibregl.GeoJSONSource;
        const zoom = await src.getClusterExpansionZoom(clusterId);
        map.easeTo({
          center: (feature.geometry as GeoJSON.Point).coordinates as [number, number],
          zoom,
        });
      });

      // Click an individual sighting -> popup with details + photo.
      map.on("click", "unclustered", async (e) => {
        const feature = e.features?.[0];
        if (!feature) return;
        const coords = (feature.geometry as GeoJSON.Point).coordinates as [number, number];
        const id = feature.properties?.id as number;
        const popup = new maplibregl.Popup({ maxWidth: "260px" })
          .setLngLat(coords)
          .setHTML("<em>Loading…</em>")
          .addTo(map);
        popup.setHTML(await loadDetailHtml(id));
      });

      for (const layer of ["clusters", "unclustered"]) {
        map.on("mouseenter", layer, () => (map.getCanvas().style.cursor = "pointer"));
        map.on("mouseleave", layer, () => (map.getCanvas().style.cursor = ""));
      }
    });

    return () => {
      searchMarkerRef.current?.remove();
      searchMarkerRef.current = null;
      mapRef.current = null;
      map.remove();
    };
  }, []);

  // Fly to a geocoder result and drop a single marker there.
  function handleSearchSelect(r: GeoResult) {
    const map = mapRef.current;
    if (!map) return;
    map.flyTo({ center: [r.lng, r.lat], zoom: 14, speed: 1.2 });
    searchMarkerRef.current?.remove();
    searchMarkerRef.current = new maplibregl.Marker({ color: "#3da5ff" })
      .setLngLat([r.lng, r.lat])
      .addTo(map);
  }

  // Toggle the land-cover raster layer's visibility.
  function toggleRaster() {
    const map = mapRef.current;
    if (!map || !map.getLayer(RASTER_LAYER_ID)) return;
    const next = !rasterVisible;
    map.setLayoutProperty(RASTER_LAYER_ID, "visibility", next ? "visible" : "none");
    setRasterVisible(next);
  }

  return (
    <>
      <div ref={containerRef} style={{ position: "absolute", inset: 0 }} />
      <SearchBox onSelect={handleSearchSelect} />
      <label
        style={{
          position: "absolute",
          top: 12,
          right: 52,
          zIndex: 10,
          display: "flex",
          alignItems: "center",
          gap: 8,
          background: "rgba(17,17,17,0.8)",
          padding: "8px 12px",
          borderRadius: 10,
          backdropFilter: "blur(4px)",
          fontSize: 13,
          cursor: "pointer",
          userSelect: "none",
        }}
      >
        <input type="checkbox" checked={rasterVisible} onChange={toggleRaster} />
        Land cover
      </label>
    </>
  );
}
