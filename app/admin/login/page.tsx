"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function AdminLogin() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    setBusy(false);
    if (res.ok) {
      router.push("/admin");
      router.refresh();
    } else {
      const d = await res.json().catch(() => ({}));
      setError(d.error || "Login failed");
    }
  }

  return (
    <main style={{ display: "grid", placeItems: "center", height: "100vh" }}>
      <form
        onSubmit={submit}
        style={{ display: "grid", gap: 12, width: 280, padding: 24, border: "1px solid #333", borderRadius: 12 }}
      >
        <h1 style={{ margin: 0, fontSize: 20 }}>Admin sign in</h1>
        <input
          style={input}
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="username"
        />
        <input
          style={input}
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
        />
        {error && <p style={{ color: "#ff6b81", fontSize: 13, margin: 0 }}>{error}</p>}
        <button type="submit" disabled={busy} style={btn}>
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </main>
  );
}

const input: React.CSSProperties = {
  padding: "8px 10px",
  borderRadius: 8,
  border: "1px solid #444",
  background: "#111",
  color: "#f2f2f2",
};
const btn: React.CSSProperties = {
  background: "#e0245e",
  color: "#fff",
  border: "none",
  padding: "10px 16px",
  borderRadius: 8,
  fontWeight: 600,
  cursor: "pointer",
};
