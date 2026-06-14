"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import SubmitDialog from "./SubmitDialog";

// MapLibre is browser-only — load it without SSR.
const Map = dynamic(() => import("./Map"), {
  ssr: false,
  loading: () => (
    <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center" }}>
      Loading map…
    </div>
  ),
});

export default function MapView() {
  const [submitOpen, setSubmitOpen] = useState(false);

  return (
    <main style={{ position: "absolute", inset: 0 }}>
      <Map />

      <header
        style={{
          position: "absolute",
          top: 12,
          left: 12,
          zIndex: 10,
          background: "rgba(17,17,17,0.8)",
          padding: "10px 14px",
          borderRadius: 10,
          backdropFilter: "blur(4px)",
        }}
      >
        <div style={{ fontWeight: 700 }}>vizi.ge</div>
        <div style={{ fontSize: 12, opacity: 0.75 }}>Have you seen this man?</div>
      </header>

      <button
        onClick={() => setSubmitOpen(true)}
        style={{
          position: "absolute",
          bottom: 20,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 10,
          background: "#e0245e",
          color: "#fff",
          border: "none",
          padding: "12px 20px",
          borderRadius: 999,
          fontWeight: 600,
          cursor: "pointer",
          boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
        }}
      >
        + Submit a sighting
      </button>

      {submitOpen && <SubmitDialog onClose={() => setSubmitOpen(false)} />}
    </main>
  );
}
