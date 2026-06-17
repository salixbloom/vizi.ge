"use client";

import { useEffect, useRef, useState } from "react";

export type GeoResult = { label: string; lng: number; lat: number; kind: string | null };

// Autocomplete place search. Debounces input, queries the WA-bounded
// /api/geocode proxy, and calls onSelect with the chosen result so the parent
// (Map) can fly there. Keeps its own UI state; holds no map reference.
export default function SearchBox({ onSelect }: { onSelect: (r: GeoResult) => void }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<GeoResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(-1);
  const abortRef = useRef<AbortController | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  // Debounced autocomplete fetch (only the latest in-flight request wins).
  useEffect(() => {
    const query = q.trim();
    if (query.length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }
    const t = setTimeout(async () => {
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      setLoading(true);
      try {
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`, { signal: ctrl.signal });
        const data = (await res.json()) as { results?: GeoResult[] };
        setResults(data.results || []);
        setActive(-1);
        setOpen(true);
      } catch {
        /* aborted or network error — leave previous results */
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  // Close the dropdown on outside click.
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  function choose(r: GeoResult) {
    onSelect(r);
    setQ(r.label);
    setOpen(false);
    setActive(-1);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || results.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (i + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (i <= 0 ? results.length - 1 : i - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      choose(results[active >= 0 ? active : 0]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div
      ref={rootRef}
      style={{
        position: "absolute",
        top: 12,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 11,
        width: "min(380px, 70vw)",
      }}
    >
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => results.length > 0 && setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder="Search a place in Washington…"
        aria-label="Search a place"
        style={{
          width: "100%",
          boxSizing: "border-box",
          background: "rgba(17,17,17,0.85)",
          color: "#fff",
          border: "1px solid rgba(255,255,255,0.15)",
          borderRadius: 10,
          padding: "10px 14px",
          fontSize: 14,
          backdropFilter: "blur(4px)",
          outline: "none",
        }}
      />
      {open && (results.length > 0 || loading) && (
        <ul
          style={{
            listStyle: "none",
            margin: "6px 0 0",
            padding: 4,
            background: "rgba(17,17,17,0.95)",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 10,
            backdropFilter: "blur(4px)",
            maxHeight: "50vh",
            overflowY: "auto",
            boxShadow: "0 8px 24px rgba(0,0,0,0.45)",
          }}
        >
          {loading && results.length === 0 && (
            <li style={{ padding: "10px 12px", fontSize: 13, opacity: 0.6 }}>Searching…</li>
          )}
          {results.map((r, i) => (
            <li
              key={`${r.lng},${r.lat},${i}`}
              onMouseDown={(e) => {
                e.preventDefault();
                choose(r);
              }}
              onMouseEnter={() => setActive(i)}
              style={{
                padding: "9px 12px",
                fontSize: 13,
                borderRadius: 7,
                cursor: "pointer",
                color: "#fff",
                background: i === active ? "rgba(224,36,94,0.25)" : "transparent",
              }}
            >
              {r.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
