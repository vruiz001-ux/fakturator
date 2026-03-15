"use client"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html>
      <body>
        <div style={{
          display: "flex",
          minHeight: "100vh",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif",
          background: "#f8fafc",
        }}>
          <div style={{ textAlign: "center", padding: "2rem" }}>
            <h2 style={{ fontSize: "1.25rem", fontWeight: 600, color: "#1e293b" }}>
              Something went wrong
            </h2>
            <p style={{ color: "#64748b", marginTop: "0.5rem", fontSize: "0.875rem" }}>
              {error.message || "An unexpected error occurred"}
            </p>
            <div style={{ marginTop: "1.5rem", display: "flex", gap: "0.75rem", justifyContent: "center" }}>
              <button
                onClick={() => {
                  try { localStorage.clear() } catch {}
                  reset()
                }}
                style={{
                  padding: "0.5rem 1rem",
                  background: "#4f46e5",
                  color: "white",
                  border: "none",
                  borderRadius: "0.5rem",
                  cursor: "pointer",
                  fontSize: "0.875rem",
                }}
              >
                Clear cache & retry
              </button>
              <button
                onClick={() => window.location.href = "/"}
                style={{
                  padding: "0.5rem 1rem",
                  background: "white",
                  color: "#334155",
                  border: "1px solid #e2e8f0",
                  borderRadius: "0.5rem",
                  cursor: "pointer",
                  fontSize: "0.875rem",
                }}
              >
                Go to homepage
              </button>
            </div>
          </div>
        </div>
      </body>
    </html>
  )
}
