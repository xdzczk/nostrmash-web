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
          background: "#090a0c",
          color: "#f4f4f2",
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          padding: 24,
        }}
      >
        <div style={{ maxWidth: 620, display: "grid", gap: 18 }}>
          <p
            style={{
              margin: 0,
              color: "#9b87f5",
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
            }}
          >
            Interrupted signal
          </p>
          <h1 style={{ margin: 0, fontSize: "clamp(34px, 7vw, 58px)", lineHeight: 1.02 }}>
            NostrMash couldn’t finish loading.
          </h1>
          <p style={{ margin: 0, color: "#9d9e9c", fontSize: 16, lineHeight: 1.65 }}>
            An unexpected interruption stopped the application. Retrying will reconnect this view.
          </p>
          {error.digest ? (
            <p style={{ margin: 0, color: "#7f817f", fontFamily: "monospace", fontSize: 12 }}>
              Reference: {error.digest}
            </p>
          ) : null}
          <button
            type="button"
            onClick={reset}
            style={{
              justifySelf: "start",
              border: 0,
              background: "#6447d9",
              color: "#ffffff",
              borderRadius: 12,
              padding: "12px 18px",
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
