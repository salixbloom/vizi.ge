"use client";

import { useEffect, useState } from "react";
import { getDeviceId } from "@/lib/device";

type Quota = { limit: number; used: number; remaining: number };

export default function SubmitDialog({ onClose }: { onClose: () => void }) {
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [quota, setQuota] = useState<Quota | null>(null);
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [note, setNote] = useState("");
  const [files, setFiles] = useState<FileList | null>(null);
  const [status, setStatus] = useState<"idle" | "submitting" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getDeviceId().then(async (id) => {
      setDeviceId(id);
      const res = await fetch(`/api/device/quota?deviceId=${id}`);
      if (res.ok) setQuota(await res.json());
    });
  }, []);

  function useMyLocation() {
    if (!navigator.geolocation) {
      setError("Geolocation not available; enter coordinates manually.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude.toFixed(6));
        setLng(pos.coords.longitude.toFixed(6));
      },
      () => setError("Could not get your location; enter it manually."),
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!deviceId) return;
    if (!files || files.length === 0) {
      setError("Add at least one photo.");
      return;
    }
    setStatus("submitting");

    const fd = new FormData();
    fd.set("type", "new");
    fd.set("lat", lat);
    fd.set("lng", lng);
    fd.set("note", note);
    fd.set("deviceId", deviceId);
    Array.from(files).forEach((f) => fd.append("images", f));

    const res = await fetch("/api/submissions", { method: "POST", body: fd });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error || "Submission failed.");
      if (data.quota) setQuota(data.quota);
      setStatus("idle");
      return;
    }
    if (data.quota) setQuota(data.quota);
    setStatus("done");
  }

  return (
    <div style={overlay} onClick={onClose}>
      <div style={panel} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>Submit a sighting</h2>
          <button onClick={onClose} style={closeBtn} aria-label="Close">
            ×
          </button>
        </div>

        {quota && (
          <p style={{ fontSize: 12, opacity: 0.7, margin: "6px 0" }}>
            {quota.remaining} of {quota.limit} submissions left today
          </p>
        )}

        {status === "done" ? (
          <div>
            <p>Thanks — your sighting is queued for review and will appear once approved.</p>
            <button onClick={onClose} style={primaryBtn}>
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={submit} style={{ display: "grid", gap: 10 }}>
            <button type="button" onClick={useMyLocation} style={secondaryBtn}>
              📍 Use my current location
            </button>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                style={input}
                placeholder="Latitude"
                value={lat}
                onChange={(e) => setLat(e.target.value)}
                required
              />
              <input
                style={input}
                placeholder="Longitude"
                value={lng}
                onChange={(e) => setLng(e.target.value)}
                required
              />
            </div>
            <textarea
              style={{ ...input, minHeight: 60 }}
              placeholder="Note (optional)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={1000}
            />
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={(e) => setFiles(e.target.files)}
            />
            {error && <p style={{ color: "#ff6b81", fontSize: 13, margin: 0 }}>{error}</p>}
            <button
              type="submit"
              style={primaryBtn}
              disabled={status === "submitting" || quota?.remaining === 0}
            >
              {status === "submitting" ? "Submitting…" : "Submit"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

const overlay: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.6)",
  display: "grid",
  placeItems: "center",
  zIndex: 100,
};
const panel: React.CSSProperties = {
  background: "#1d1d1d",
  padding: 20,
  borderRadius: 12,
  width: "min(420px, 92vw)",
  border: "1px solid #333",
};
const input: React.CSSProperties = {
  flex: 1,
  padding: "8px 10px",
  borderRadius: 8,
  border: "1px solid #444",
  background: "#111",
  color: "#f2f2f2",
  width: "100%",
};
const primaryBtn: React.CSSProperties = {
  background: "#e0245e",
  color: "#fff",
  border: "none",
  padding: "10px 16px",
  borderRadius: 8,
  fontWeight: 600,
  cursor: "pointer",
};
const secondaryBtn: React.CSSProperties = {
  background: "#2a2a2a",
  color: "#f2f2f2",
  border: "1px solid #444",
  padding: "10px 16px",
  borderRadius: 8,
  cursor: "pointer",
};
const closeBtn: React.CSSProperties = {
  background: "none",
  border: "none",
  color: "#aaa",
  fontSize: 24,
  cursor: "pointer",
  lineHeight: 1,
};
