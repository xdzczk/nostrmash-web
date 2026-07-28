import { ImageResponse } from "next/og";
import type { ReactNode } from "react";

export const ogSize = { width: 1200, height: 630 } as const;
export const ogContentType = "image/png";

/** Single source of truth for branded OG navy/indigo gradients. */
export const OG_GRADIENT = {
  default: "linear-gradient(145deg, #0b1020 0%, #151b33 55%, #1d2450 100%)",
  hashtag: "linear-gradient(145deg, #0d1224 0%, #1b2750 100%)",
  profile: "linear-gradient(145deg, #10152a 0%, #1a2344 55%, #2a3a72 100%)",
  note: "linear-gradient(145deg, #0b1020 0%, #171f3d 60%, #24306a 100%)",
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
  variant: keyof typeof OG_GRADIENT;
}) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 64,
        background: OG_GRADIENT[variant],
        color: OG_INK,
        fontFamily: `${DISPLAY_FONT_FAMILY}, sans-serif`,
      }}
    >
      <div
        style={{
          fontSize: 24,
          letterSpacing: 3,
          opacity: 0.65,
          fontFamily: "sans-serif",
        }}
      >
        {eyebrow}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>{children}</div>
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
  variant?: keyof typeof OG_GRADIENT;
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
