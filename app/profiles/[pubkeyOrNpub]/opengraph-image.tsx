import { notFound } from "next/navigation";

import { normalizeImageSrc } from "@/components/explorer/utils";
import { getProfileSummary } from "@/lib/api/endpoints";
import { isApiError } from "@/lib/api/errors";
import {
  createOgImage,
  loadOgAvatar,
  ogContentType,
  ogSize,
  type OgMetaItem,
} from "@/lib/og/template";
import { formatNip05, formatTrustTier, lastActiveLabel } from "@/lib/profile/hero-signals";
import { isValidPubkeyOrNpubParam, resolvePubkeyParam } from "@/lib/routing/params";
import type { Profile, ProfileSummaryResponse } from "@/lib/types/api";

export const runtime = "nodejs";
export const size = ogSize;
export const contentType = ogContentType;

type Params = Promise<{ pubkeyOrNpub: string }>;

function compactCount(value: unknown): string | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  if (value < 10_000) return value.toLocaleString("en-US");
  if (value < 1_000_000) return `${(value / 1_000).toFixed(value < 100_000 ? 1 : 0)}K`;
  return `${(value / 1_000_000).toFixed(1)}M`;
}

export default async function ProfileOpenGraphImage({ params }: { params: Params }) {
  const { pubkeyOrNpub } = await params;
  if (!isValidPubkeyOrNpubParam(pubkeyOrNpub)) {
    notFound();
  }

  const pubkey = resolvePubkeyParam(pubkeyOrNpub) ?? pubkeyOrNpub;
  let summary: ProfileSummaryResponse | null = null;
  try {
    summary = await getProfileSummary(pubkey, "shortTtl");
  } catch (error) {
    // Keep the image's status in step with the page: unknown profile → 404.
    if (isApiError(error) && error.isNotFound) {
      notFound();
    }
    // Any other upstream failure: fall through to a generic card.
  }

  const profile: Profile | null = summary
    ? (summary.profile ?? (summary as unknown as Profile))
    : null;

  const name =
    (typeof profile?.display_name === "string" && profile.display_name.trim()) ||
    (typeof profile?.name === "string" && profile.name.trim()) ||
    `${pubkeyOrNpub.slice(0, 12)}…${pubkeyOrNpub.slice(-6)}`;
  const handle = formatNip05(profile?.nip05);
  const aboutRaw = typeof profile?.about === "string" ? profile.about.trim() : "";
  const about = aboutRaw.length > 140 ? `${aboutRaw.slice(0, 139).trimEnd()}…` : aboutRaw;
  const subtitle = [handle, about].filter(Boolean).join(" · ") || "Nostr profile on NostrMash";

  const stats = summary?.stats;
  const meta: OgMetaItem[] = [];
  const followers = compactCount(stats?.follower_count);
  if (followers) meta.push({ label: "Followers", value: followers });
  const notes = compactCount(stats?.note_count);
  if (notes) meta.push({ label: "Notes", value: notes });
  const active = lastActiveLabel(stats?.recent_activity_at, Date.now());
  if (active) meta.push({ label: "Last active", value: active.replace(/^Active /, "") });

  const trust = formatTrustTier(summary?.trust_summary);
  const avatarUrl = await loadOgAvatar(normalizeImageSrc(profile?.picture));

  return createOgImage({
    eyebrow: "NOSTRMASH · PROFILE",
    title: name,
    subtitle,
    variant: "profile",
    titleSize: 60,
    avatarUrl,
    avatarInitial: name.charAt(0).toUpperCase(),
    meta,
    badge: trust ? `Trust · ${trust.label}` : undefined,
  });
}
