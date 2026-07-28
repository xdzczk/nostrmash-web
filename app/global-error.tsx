"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          fontFamily: "system-ui, sans-serif",
          background: "#0b0f14",
          color: "#e8eef5",
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          padding: 24,
        }}
      >
        <div style={{ maxWidth: 420, display: "grid", gap: 12 }}>
          <h1 style={{ margin: 0, fontSize: 20 }}>Something went wrong</h1>
          <p style={{ margin: 0, color: "#9aa7b5", fontSize: 14, lineHeight: 1.5 }}>
            The application hit an unexpected error. Retrying usually helps.
          </p>
          {error.digest ? (
            <p style={{ margin: 0, color: "#6b7785", fontFamily: "monospace", fontSize: 12 }}>
              Reference: {error.digest}
            </p>
          ) : null}
          <button
            type="button"
            onClick={reset}
            style={{
              justifySelf: "start",
              border: "1px solid #3a4654",
              background: "#15202b",
              color: "#e8eef5",
              borderRadius: 8,
              padding: "8px 12px",
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
