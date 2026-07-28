import { ImageResponse } from "next/og";

import { getProfileSummary } from "@/lib/api/endpoints";
import { isValidPubkeyOrNpubParam, resolvePubkeyParam } from "@/lib/routing/params";

export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

type Params = Promise<{ pubkeyOrNpub: string }>;

export default async function ProfileOpenGraphImage({ params }: { params: Params }) {
  const { pubkeyOrNpub } = await params;
  let name = pubkeyOrNpub.slice(0, 24);
  let about = "Nostr profile on NostrMash";

  if (isValidPubkeyOrNpubParam(pubkeyOrNpub)) {
    const pubkey = resolvePubkeyParam(pubkeyOrNpub) ?? pubkeyOrNpub;
    try {
      const summary = await getProfileSummary(pubkey, "shortTtl");
      const profile =
        (summary as { profile?: Record<string, unknown> }).profile ??
        (summary as unknown as Record<string, unknown>);
      name =
        (typeof profile?.display_name === "string" && profile.display_name) ||
        (typeof profile?.name === "string" && profile.name) ||
        name;
      about = (typeof profile?.about === "string" && profile.about.slice(0, 160)) || about;
    } catch {
      // defaults
    }
  }

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 64,
        background: "linear-gradient(145deg, #10152a 0%, #1a2344 55%, #2a3a72 100%)",
        color: "#f4f6ff",
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ fontSize: 24, letterSpacing: 3, opacity: 0.65 }}>NOSTRMASH · PROFILE</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <div style={{ fontSize: 64, fontWeight: 700 }}>{name}</div>
        <div style={{ fontSize: 28, opacity: 0.8, maxWidth: 900 }}>{about}</div>
      </div>
    </div>,
    { ...size }
  );
}
