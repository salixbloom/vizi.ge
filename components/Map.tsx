"use client";

import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef } from "react";

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

  useEffect(() => {
    if (!containerRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: STYLE_URL,
      center: WA_CENTER,
      zoom: WA_ZOOM,
    });
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

    return () => map.remove();
  }, []);

  return <div ref={containerRef} style={{ position: "absolute", inset: 0 }} />;
}
