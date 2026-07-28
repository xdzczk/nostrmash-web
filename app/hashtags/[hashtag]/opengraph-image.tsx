import { ImageResponse } from "next/og";

export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

type Params = Promise<{ hashtag: string }>;

export default async function HashtagOpenGraphImage({ params }: { params: Params }) {
  const { hashtag } = await params;
  const tag = decodeURIComponent(hashtag).replace(/^#/, "");

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: 64,
        background: "linear-gradient(145deg, #0d1224 0%, #1b2750 100%)",
        color: "#f4f6ff",
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ fontSize: 24, letterSpacing: 3, opacity: 0.65, marginBottom: 24 }}>
        NOSTRMASH · HASHTAG
      </div>
      <div style={{ fontSize: 84, fontWeight: 750 }}>#{tag}</div>
      <div style={{ fontSize: 28, opacity: 0.8, marginTop: 18 }}>
        Trending notes and activity for this topic
      </div>
    </div>,
    { ...size }
  );
}
