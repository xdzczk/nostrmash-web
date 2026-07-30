import { ImageResponse } from "next/og";
import type { ReactNode } from "react";

export const ogSize = { width: 1200, height: 630 } as const;
export const ogContentType = "image/png";

/** Restrained surfaces keep shared images aligned with the product UI. */
export const OG_SURFACE = {
  default: "#090a0c",
  hashtag: "#0b0a0e",
  profile: "#0a0b0e",
  note: "#090a0c",
} as const;

const OG_INK = "#f4f6ff";
const DISPLAY_FONT_FAMILY = "Bricolage Grotesque";

async function loadDisplayFont(): Promise<ArrayBuffer | null> {
  try {
    const response = await fetch(
      "https://cdn.jsdelivr.net/fontsource/fonts/bricolage-grotesque@latest/latin-600-normal.woff"
    );
    if (!response.ok) return null;
    return response.arrayBuffer();
  } catch {
    return null;
  }
}

function OgFrame({
  eyebrow,
  children,
  variant,
}: {
  eyebrow: string;
  children: ReactNode;
  variant: keyof typeof OG_SURFACE;
}) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        position: "relative",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 64,
        background: OG_SURFACE[variant],
        color: OG_INK,
        fontFamily: `${DISPLAY_FONT_FAMILY}, sans-serif`,
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 26 }}>
        <div style={{ width: 112, height: 4, borderRadius: 999, background: "#9b87f5" }} />
        <div
          style={{
            fontSize: 20,
            letterSpacing: 3.5,
            opacity: 0.62,
            fontFamily: "sans-serif",
            textTransform: "uppercase",
          }}
        >
          {eyebrow}
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>{children}</div>
      <div
        style={{
          position: "absolute",
          right: 64,
          bottom: 64,
          color: "#9d9e9c",
          fontSize: 22,
          fontFamily: "sans-serif",
        }}
      >
        NostrMash
      </div>
    </div>
  );
}

export async function createOgImage({
  eyebrow,
  title,
  subtitle,
  variant = "default",
  titleSize = 64,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  variant?: keyof typeof OG_SURFACE;
  titleSize?: number;
}): Promise<ImageResponse> {
  const fontData = await loadDisplayFont();

  return new ImageResponse(
    <OgFrame eyebrow={eyebrow} variant={variant}>
      <div
        style={{
          fontSize: titleSize,
          fontWeight: 600,
          lineHeight: 1.1,
          maxHeight: 320,
          overflow: "hidden",
        }}
      >
        {title}
      </div>
      {subtitle ? (
        <div style={{ fontSize: 28, opacity: 0.8, maxWidth: 900, fontFamily: "sans-serif" }}>
          {subtitle}
        </div>
      ) : null}
    </OgFrame>,
    {
      ...ogSize,
      fonts: fontData
        ? [
            {
              name: DISPLAY_FONT_FAMILY,
              data: fontData,
              style: "normal" as const,
              weight: 600 as const,
            },
          ]
        : undefined,
    }
  );
}
