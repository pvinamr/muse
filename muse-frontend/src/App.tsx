import { useEffect, useMemo, useState } from "react";

type Clip = {
  id: number;
  type: string;
  content: string;
  url: string | null;
  title: string | null;
  summary: string | null;
  created_at: string;
};

const API_BASE = "http://127.0.0.1:8000";

export default function App() {
  const [query, setQuery] = useState("");
  const [clips, setClips] = useState<Clip[]>([]);
  const [selected, setSelected] = useState<Clip | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const endpoint = useMemo(() => {
    const q = query.trim();
    if (q.length === 0) return `${API_BASE}/clips`;
    return `${API_BASE}/search?q=${encodeURIComponent(q)}&limit=50`;
  }, [query]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(endpoint)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data: Clip[]) => {
        if (cancelled) return;
        setClips(data);
        setSelected((prev) => {
          if (!prev) return data[0] ?? null;
          return data.find((c) => c.id === prev.id) ?? data[0] ?? null;
        });
      })
      .catch((e) => {
        if (cancelled) return;
        setError(String(e));
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [endpoint]);

  const headerSubtitle = loading
    ? "Loading…"
    : query.trim()
    ? `Results for “${query.trim()}”`
    : "Recent clips";

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "360px 1fr",
        height: "100vh",
        fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif",
        background: "#ffffff",
        color: "#1f2937",
      }}
    >
      {/* LEFT: Sidebar */}
      <div
        style={{
          borderRight: "1px solid #e5e7eb",
          background: "#f9fafb",
          display: "flex",
          flexDirection: "column",
          minWidth: 0,
        }}
      >
        <div style={{ padding: 16 }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: "#111827" }}>Muse</div>

          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search clips…"
            style={{
              width: "100%",
              marginTop: 12,
              padding: "10px 12px",
              borderRadius: 12,
              border: "1px solid #d1d5db",
              background: "#ffffff",
              color: "#111827",
              fontSize: 14,
              outline: "none",
              boxSizing: "border-box",
            }}
          />

          <div style={{ marginTop: 10, fontSize: 12, color: "#6b7280" }}>
            {headerSubtitle}
            {error ? <span style={{ color: "#b91c1c" }}> — {error}</span> : null}
          </div>
        </div>

        <div style={{ overflowY: "auto", padding: "0 12px 12px" }}>
          {clips.map((c) => {
            const isActive = selected?.id === c.id;

            let displayTitle = c.title ?? "Untitled";
            try {
              if (!c.title && c.url) displayTitle = new URL(c.url).hostname;
            } catch {
              // ignore URL parse errors
            }

            const preview = c.content.length > 120 ? c.content.slice(0, 120) + "…" : c.content;

            return (
              <button
                key={c.id}
                onClick={() => setSelected(c)}
                style={{
                  width: "100%",
                  textAlign: "left",
                  padding: 14,
                  marginTop: 10,
                  borderRadius: 14,
                  border: isActive ? "1px solid #c7d2fe" : "1px solid #e5e7eb",
                  background: isActive ? "#eef2ff" : "#ffffff",
                  cursor: "pointer",
                  transition: "background 0.15s ease, border 0.15s ease",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
                }}
              >
                <div
                  style={{
                    fontWeight: 700,
                    fontSize: 13,
                    color: "#111827",
                    marginBottom: 6,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                  title={displayTitle}
                >
                  {displayTitle}
                </div>

                <div style={{ fontSize: 12, color: "#4b5563", lineHeight: 1.35 }}>
                  {preview}
                </div>

                <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 10 }}>
                  #{c.id} • {new Date(c.created_at).toLocaleString()}
                </div>
              </button>
            );
          })}

          {!loading && clips.length === 0 ? (
            <div
              style={{
                marginTop: 14,
                padding: 12,
                borderRadius: 12,
                border: "1px dashed #d1d5db",
                color: "#6b7280",
                background: "#ffffff",
              }}
            >
              No results.
            </div>
          ) : null}
        </div>
      </div>

      {/* RIGHT: Detail */}
      <div
        style={{
          padding: 32,
          overflowY: "auto",
          background: "#ffffff",
          minWidth: 0,
        }}
      >
        {!selected ? (
          <div style={{ color: "#6b7280" }}>Select a clip.</div>
        ) : (
          <>
            <div style={{ fontSize: 24, fontWeight: 800, marginBottom: 10, color: "#111827" }}>
              {selected.title || "Untitled"}
            </div>

            {selected.url ? (
              <div style={{ marginBottom: 18, fontSize: 13 }}>
                <a
                  href={selected.url}
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: "#2563eb", textDecoration: "none", fontWeight: 600 }}
                >
                  Open source
                </a>
                <span style={{ color: "#9ca3af" }}> — {selected.url}</span>
              </div>
            ) : null}

            <div
              style={{
                whiteSpace: "pre-wrap",
                lineHeight: 1.7,
                fontSize: 15,
                color: "#374151",
              }}
            >
              {selected.content}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
