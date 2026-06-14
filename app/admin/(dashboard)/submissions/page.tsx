"use client";

import { useCallback, useEffect, useState } from "react";

type Img = { id: number; thumbPath: string };
type Sub = {
  id: number;
  type: string;
  targetLocationId: number | null;
  lat: number;
  lng: number;
  note: string | null;
  deviceId: string;
  status: string;
  submittedAt: string;
};
type Row = { submission: Sub; images: Img[] };

const STATUSES = ["pending", "approved", "rejected", "all"];

export default function SubmissionsPage() {
  const [status, setStatus] = useState("pending");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const q = status === "all" ? "" : `?status=${status}`;
    const res = await fetch(`/api/admin/submissions${q}`);
    const data = await res.json();
    setRows(data.submissions ?? []);
    setLoading(false);
  }, [status]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <h1 style={{ margin: 0 }}>Submissions</h1>
      <div style={{ display: "flex", gap: 8 }}>
        {STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            style={{
              padding: "6px 12px",
              borderRadius: 8,
              border: "1px solid #444",
              background: status === s ? "#e0245e" : "#222",
              color: "#fff",
              cursor: "pointer",
              textTransform: "capitalize",
            }}
          >
            {s}
          </button>
        ))}
      </div>

      {loading ? (
        <p>Loading…</p>
      ) : rows.length === 0 ? (
        <p style={{ opacity: 0.7 }}>No submissions.</p>
      ) : (
        rows.map((row) => <SubmissionCard key={row.submission.id} row={row} onChange={load} />)
      )}
    </div>
  );
}

function SubmissionCard({ row, onChange }: { row: Row; onChange: () => void }) {
  const s = row.submission;
  const [lat, setLat] = useState(String(s.lat));
  const [lng, setLng] = useState(String(s.lng));
  const [label, setLabel] = useState("");
  const [description, setDescription] = useState(s.note ?? "");
  const [rejectNote, setRejectNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const pending = s.status === "pending";

  async function approve() {
    setBusy(true);
    const res = await fetch(`/api/admin/submissions/${s.id}/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lat, lng, label: label || null, description: description || null }),
    });
    setBusy(false);
    if (res.ok) onChange();
    else setMsg((await res.json()).error || "Failed");
  }

  async function reject() {
    setBusy(true);
    const res = await fetch(`/api/admin/submissions/${s.id}/reject`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note: rejectNote }),
    });
    setBusy(false);
    if (res.ok) onChange();
    else setMsg((await res.json()).error || "Failed");
  }

  return (
    <div style={card}>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 8 }}>
          {row.images.map((img) => (
            <a key={img.id} href={`/api/images/${img.id}`} target="_blank" rel="noreferrer">
              <img
                src={`/api/images/${img.id}?v=thumb`}
                alt=""
                style={{ width: 120, height: 120, objectFit: "cover", borderRadius: 8 }}
              />
            </a>
          ))}
          {row.images.length === 0 && <div style={{ opacity: 0.5 }}>no images</div>}
        </div>

        <div style={{ flex: 1, minWidth: 260, display: "grid", gap: 6 }}>
          <div style={{ fontSize: 12, opacity: 0.7 }}>
            #{s.id} · {s.type}
            {s.targetLocationId ? ` → loc ${s.targetLocationId}` : ""} · {s.status} ·{" "}
            {s.submittedAt} · device {s.deviceId.slice(0, 10)}…
          </div>
          {s.note && <div style={{ fontSize: 13 }}>“{s.note}”</div>}

          {pending && (
            <>
              <div style={{ display: "flex", gap: 8 }}>
                <input style={input} value={lat} onChange={(e) => setLat(e.target.value)} />
                <input style={input} value={lng} onChange={(e) => setLng(e.target.value)} />
              </div>
              <input
                style={input}
                placeholder="Label (shown on map)"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
              />
              <textarea
                style={{ ...input, minHeight: 44 }}
                placeholder="Description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <button onClick={approve} disabled={busy} style={approveBtn}>
                  Approve
                </button>
                <input
                  style={{ ...input, flex: 1 }}
                  placeholder="Reason (for rejection)"
                  value={rejectNote}
                  onChange={(e) => setRejectNote(e.target.value)}
                />
                <button onClick={reject} disabled={busy} style={rejectBtn}>
                  Reject
                </button>
              </div>
              {msg && <span style={{ color: "#ff6b81", fontSize: 13 }}>{msg}</span>}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const card: React.CSSProperties = {
  background: "#1b1b1b",
  border: "1px solid #333",
  borderRadius: 12,
  padding: 16,
};
const input: React.CSSProperties = {
  padding: "7px 10px",
  borderRadius: 8,
  border: "1px solid #444",
  background: "#111",
  color: "#f2f2f2",
};
const approveBtn: React.CSSProperties = {
  background: "#238636",
  color: "#fff",
  border: "none",
  padding: "8px 16px",
  borderRadius: 8,
  fontWeight: 600,
  cursor: "pointer",
};
const rejectBtn: React.CSSProperties = {
  background: "#6e2530",
  color: "#fff",
  border: "none",
  padding: "8px 16px",
  borderRadius: 8,
  cursor: "pointer",
};
