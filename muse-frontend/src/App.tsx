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
        setSelected((prev) => (prev ? data.find((c) => c.id === prev.id) ?? data[0] ?? null : data[0] ?? null));
      })
      .catch((e) => !cancelled && setError(String(e)))
      .finally(() => !cancelled && setLoading(false));

    return () => {
      cancelled = true;
    };
  }, [endpoint]);

  return (
    <div style={{ display: "flex", height: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ width: 420, borderRight: "1px solid #eee", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: 12 }}>
          <div style={{ fontSize: 18, fontWeight: 700 }}>Muse</div>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search clips…"
            style={{
              width: "100%",
              marginTop: 10,
              padding: "10px 12px",
              borderRadius: 10,
              border: "1px solid #ddd",
              outline: "none",
            }}
          />
          <div style={{ marginTop: 8, fontSize: 12, color: "#666" }}>
            {loading ? "Loading…" : query.trim() ? `Results for “${query.trim()}”` : "Recent clips"}
            {error ? ` — ${error}` : null}
          </div>
        </div>

        <div style={{ overflowY: "auto", padding: 8 }}>
          {clips.map((c) => {
            const isActive = selected?.id === c.id;
            const title = c.title || (c.url ? new URL(c.url).hostname : "Untitled");
            const preview = c.content.length > 120 ? c.content.slice(0, 120) + "…" : c.content;

            return (
              <button
                key={c.id}
                onClick={() => setSelected(c)}
                style={{
                  width: "100%",
                  textAlign: "left",
                  padding: 12,
                  marginBottom: 8,
                  borderRadius: 12,
                  border: isActive ? "1px solid #bbb" : "1px solid #eee",
                  background: isActive ? "#f6f6f6" : "white",
                  cursor: "pointer",
                }}
              >
                <div style={{ fontWeight: 650, fontSize: 14, marginBottom: 6 }}>{title}</div>
                <div style={{ fontSize: 12, color: "#555", lineHeight: 1.35 }}>{preview}</div>
                <div style={{ fontSize: 11, color: "#888", marginTop: 8 }}>
                  #{c.id} • {new Date(c.created_at).toLocaleString()}
                </div>
              </button>
            );
          })}
          {(!loading && clips.length === 0) ? (
            <div style={{ padding: 12, color: "#666" }}>No results.</div>
          ) : null}
        </div>
      </div>

      <div style={{ flex: 1, padding: 18, overflowY: "auto" }}>
        {!selected ? (
          <div style={{ color: "#666" }}>Select a clip.</div>
        ) : (
          <>
            <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>
              {selected.title || "Untitled"}
            </div>

            {selected.url ? (
              <div style={{ marginBottom: 14 }}>
                <a href={selected.url} target="_blank" rel="noreferrer" style={{ color: "#0b57d0" }}>
                  Open source
                </a>
                <span style={{ color: "#999" }}> — {selected.url}</span>
              </div>
            ) : null}

            <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.55, fontSize: 14 }}>
              {selected.content}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
