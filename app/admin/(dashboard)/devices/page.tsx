"use client";

import { useCallback, useEffect, useState } from "react";

type Device = {
  deviceId: string;
  firstSeen: string;
  lastSeen: string;
  submissionCount: number;
  blocked: boolean;
};

export default function DevicesPage() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/devices");
    const data = await res.json();
    setDevices(data.devices ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function toggle(d: Device) {
    await fetch(`/api/admin/devices/${d.deviceId}/block`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ blocked: !d.blocked }),
    });
    load();
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <h1 style={{ margin: 0 }}>Devices</h1>
      {loading ? (
        <p>Loading…</p>
      ) : devices.length === 0 ? (
        <p style={{ opacity: 0.7 }}>No devices yet.</p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <thead>
            <tr style={{ textAlign: "left", opacity: 0.7 }}>
              <th style={th}>Device</th>
              <th style={th}>Submissions</th>
              <th style={th}>First seen</th>
              <th style={th}>Last seen</th>
              <th style={th}>Status</th>
              <th style={th}></th>
            </tr>
          </thead>
          <tbody>
            {devices.map((d) => (
              <tr key={d.deviceId} style={{ borderTop: "1px solid #2a2a2a" }}>
                <td style={td}>
                  <code>{d.deviceId.slice(0, 16)}…</code>
                </td>
                <td style={td}>{d.submissionCount}</td>
                <td style={td}>{d.firstSeen}</td>
                <td style={td}>{d.lastSeen}</td>
                <td style={td}>
                  {d.blocked ? (
                    <span style={{ color: "#f85149" }}>blocked</span>
                  ) : (
                    <span style={{ color: "#3fb950" }}>active</span>
                  )}
                </td>
                <td style={td}>
                  <button
                    onClick={() => toggle(d)}
                    style={{
                      padding: "5px 10px",
                      borderRadius: 6,
                      border: "1px solid #444",
                      background: d.blocked ? "#238636" : "#6e2530",
                      color: "#fff",
                      cursor: "pointer",
                    }}
                  >
                    {d.blocked ? "Unblock" : "Block"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

const th: React.CSSProperties = { padding: "6px 8px", fontWeight: 600 };
const td: React.CSSProperties = { padding: "8px" };
