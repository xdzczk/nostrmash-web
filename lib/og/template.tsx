import { ImageResponse } from "next/og";
import type { ReactNode } from "react";

import { blossomCandidateUrls } from "@/lib/media/blossom";

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
  badge,
}: {
  eyebrow: string;
  children: ReactNode;
  variant: keyof typeof OG_SURFACE;
  badge?: string;
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
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
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
          {badge ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                fontSize: 20,
                padding: "6px 16px",
                borderRadius: 999,
                border: "1.5px solid rgba(163,159,151,0.5)",
                background: "rgba(98,95,89,0.18)",
                color: "#dedbd4",
                fontFamily: "sans-serif",
              }}
            >
              {badge}
            </div>
          ) : null}
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

export type OgMetaItem = { label: string; value: string };

const AVATAR_SIZE = 160;
const AVATAR_FETCH_TIMEOUT_MS = 2500;
const AVATAR_MAX_BYTES = 2_000_000;

type OgImageRead = { kind: "ok"; dataUrl: string } | { kind: "missing" } | { kind: "stop" };

/**
 * One GET inside the shared avatar budget. A missing blob or a dropped
 * connection can move on to the next mirror. A response that is present but
 * unusable (wrong type, empty, too large) stops the search.
 */
async function readOgImage(url: string, signal: AbortSignal): Promise<OgImageRead> {
  try {
    const response = await fetch(url, {
      signal,
      headers: { Accept: "image/png,image/jpeg,image/webp,image/*;q=0.8" },
    });
    if (!response.ok) return { kind: "missing" };
    const type = response.headers.get("content-type") ?? "";
    if (!/^image\/(png|jpe?g|webp|gif)/i.test(type)) return { kind: "stop" };
    const buffer = await response.arrayBuffer();
    if (buffer.byteLength === 0 || buffer.byteLength > AVATAR_MAX_BYTES) return { kind: "stop" };
    const mime = type.split(";")[0]?.trim() || "image/png";
    return {
      kind: "ok",
      dataUrl: `data:${mime};base64,${Buffer.from(buffer).toString("base64")}`,
    };
  } catch {
    return signal.aborted ? { kind: "stop" } : { kind: "missing" };
  }
}

/**
 * Fetch a remote avatar and inline it as a data URL so Satori does not have
 * to make its own network request (and so a slow/broken UGC host degrades to
 * the fallback disc instead of failing the whole image). A Blossom blob that
 * 404s is retried on other public servers inside the same time budget.
 */
export async function loadOgAvatar(url: string | undefined | null): Promise<string | null> {
  if (!url || !/^https:\/\//i.test(url)) return null;
  const signal = AbortSignal.timeout(AVATAR_FETCH_TIMEOUT_MS);
  for (const candidate of blossomCandidateUrls(url)) {
    if (signal.aborted) return null;
    if (!/^https:\/\//i.test(candidate)) continue;
    const result = await readOgImage(candidate, signal);
    if (result.kind === "ok") return result.dataUrl;
    if (result.kind === "stop") return null;
  }
  return null;
}

function OgAvatar({ src, initial }: { src: string | null; initial: string }) {
  const common = {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: 999,
    flexShrink: 0,
    border: "3px solid rgba(255,255,255,0.14)",
  } as const;
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element -- Satori renders plain <img>
    return <img src={src} alt="" style={{ ...common, objectFit: "cover" }} />;
  }
  return (
    <div
      style={{
        ...common,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #4b4944 0%, #282825 100%)",
        fontSize: 72,
        fontWeight: 600,
        color: OG_INK,
      }}
    >
      {initial}
    </div>
  );
}

export async function createOgImage({
  eyebrow,
  title,
  subtitle,
  variant = "default",
  titleSize = 64,
  avatarUrl,
  avatarInitial,
  meta,
  badge,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  variant?: keyof typeof OG_SURFACE;
  titleSize?: number;
  /** Already-inlined (data:) or https avatar; see `loadOgAvatar`. */
  avatarUrl?: string | null;
  /** Letter shown in the fallback disc when the avatar is missing. */
  avatarInitial?: string;
  /** Stats row rendered under the title/subtitle, e.g. Followers / Notes. */
  meta?: OgMetaItem[];
  /** Small pill next to the eyebrow, e.g. "Trust · Seed · top 0.1%". */
  badge?: string;
}): Promise<ImageResponse> {
  const fontData = await loadDisplayFont();
  const showAvatar = avatarUrl !== undefined || avatarInitial !== undefined;
  const metaItems = (meta ?? []).filter((item) => item.value.trim().length > 0).slice(0, 4);

  const heading = (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, minWidth: 0 }}>
      <div
        style={{
          fontSize: titleSize,
          fontWeight: 600,
          lineHeight: 1.1,
          maxHeight: showAvatar ? 160 : 320,
          overflow: "hidden",
        }}
      >
        {title}
      </div>
      {subtitle ? (
        <div
          style={{
            fontSize: 28,
            opacity: 0.8,
            maxWidth: 900,
            maxHeight: 80,
            overflow: "hidden",
            lineHeight: 1.4,
            fontFamily: "sans-serif",
          }}
        >
          {subtitle}
        </div>
      ) : null}
    </div>
  );

  return new ImageResponse(
    <OgFrame eyebrow={eyebrow} variant={variant} badge={badge}>
      {showAvatar ? (
        <div style={{ display: "flex", alignItems: "center", gap: 40 }}>
          <OgAvatar src={avatarUrl ?? null} initial={avatarInitial ?? (title.charAt(0) || "N")} />
          {heading}
        </div>
      ) : (
        heading
      )}
      {metaItems.length > 0 ? (
        <div style={{ display: "flex", gap: 48, marginTop: 10 }}>
          {metaItems.map((item) => (
            <div key={item.label} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <div
                style={{
                  fontSize: 18,
                  letterSpacing: 2,
                  opacity: 0.55,
                  textTransform: "uppercase",
                  fontFamily: "sans-serif",
                }}
              >
                {item.label}
              </div>
              <div style={{ fontSize: 34, fontWeight: 600 }}>{item.value}</div>
            </div>
          ))}
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
