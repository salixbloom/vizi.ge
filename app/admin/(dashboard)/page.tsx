"use client";

import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { DashboardMetrics } from "@/lib/metrics";

export default function Overview() {
  const [m, setM] = useState<DashboardMetrics | null>(null);

  useEffect(() => {
    fetch("/api/admin/metrics")
      .then((r) => r.json())
      .then(setM)
      .catch(() => {});
  }, []);

  if (!m) return <p>Loading metrics…</p>;

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <h1 style={{ margin: 0 }}>Overview</h1>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <Stat label="Approved locations" value={m.locations.approved} />
        <Stat label="Pending submissions" value={m.submissions.pending} accent />
        <Stat label="Total submissions" value={m.submissions.total} />
        <Stat label="Devices" value={m.devices.total} />
        <Stat label="Blocked devices" value={m.devices.blocked} />
      </div>

      <div style={card}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span
            style={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              background: m.tileServer.healthy ? "#3fb950" : "#f85149",
            }}
          />
          <strong>light-maps tile server</strong>
          <span style={{ opacity: 0.7, fontSize: 13 }}>
            {m.tileServer.url} — {m.tileServer.healthy ? "healthy" : "unreachable"}
            {m.tileServer.status ? ` (${m.tileServer.status})` : ""}
          </span>
        </div>
      </div>

      <div style={card}>
        <strong>Submissions (last 14 days)</strong>
        <div style={{ height: 240, marginTop: 12 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={m.perDay}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis dataKey="date" tick={{ fill: "#aaa", fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fill: "#aaa", fontSize: 11 }} />
              <Tooltip contentStyle={{ background: "#222", border: "1px solid #444" }} />
              <Bar dataKey="count" fill="#e0245e" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div style={{ ...card, minWidth: 150 }}>
      <div style={{ fontSize: 28, fontWeight: 700, color: accent ? "#e0245e" : "#fff" }}>
        {value}
      </div>
      <div style={{ fontSize: 13, opacity: 0.7 }}>{label}</div>
    </div>
  );
}

const card: React.CSSProperties = {
  background: "#1b1b1b",
  border: "1px solid #333",
  borderRadius: 12,
  padding: 16,
};
