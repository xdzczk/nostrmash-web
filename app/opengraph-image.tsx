import { ImageResponse } from "next/og";

export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 64,
        background: "linear-gradient(145deg, #0b1020 0%, #151b33 55%, #1d2450 100%)",
        color: "#f4f6ff",
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ fontSize: 28, letterSpacing: 4, opacity: 0.7 }}>NOSTRMASH</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ fontSize: 72, fontWeight: 700, lineHeight: 1.05 }}>
          Explore the Nostr network
        </div>
        <div style={{ fontSize: 30, opacity: 0.8, maxWidth: 820 }}>
          Search, trends, profiles, and relay health in one place.
        </div>
      </div>
    </div>,
    { ...size }
  );
}
