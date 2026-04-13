import Image from "next/image";
import Link from "next/link";

import {
  DiscoveryActionLinks,
  DiscoveryPill,
  DiscoveryStatPills,
} from "@/components/explorer/card-grammar";
import { IdBadge } from "@/components/explorer/id-badge";
import { EmptyState } from "@/components/explorer/empty-state";
import { mapProfileWhyNow, WhyNow } from "@/components/explorer/why-now";
import {
  extractPrimitiveStats,
  profileFallbackAvatarDataUrl,
  profileIdentifier,
  profileLabel,
  profilePictureUrl,
  truncateIdentifier,
} from "@/components/explorer/utils";
import type { Profile } from "@/lib/types/api";

const PROFILE_STAT_EXCLUDE = [
  "pubkey",
  "npub",
  "name",
  "display_name",
  "displayName",
  "display",
  "displayname",
  "about",
  "picture",
  "image",
  "avatar",
  "avatar_url",
  "avatarUrl",
  "pfp",
  "picture_url",
  "pictureUrl",
  "profile_image",
  "profile_picture",
  "website",
  "nip05",
  "nip_05",
  "lud16",
];

const PROFILE_METRIC_PRIORITY = [
  /new.*follower|follower.*new/i,
  /note|event|author|activity|recent/i,
  /reply|mention|visibility|reach/i,
  /relay|follower|following|score|rank|trust|cross/i,
];

function readProfileText(profile: Profile, keys: string[]): string | null {
  const record = profile as Record<string, unknown>;
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }
  return null;
}

function isHexLike(value: string | null | undefined): boolean {
  return typeof value === "string" && /^[0-9a-f]{40,}$/i.test(value.trim());
}

function buildIdentityBits(profile: Profile, label: string, identifier: string): string[] {
  const name = readProfileText(profile, ["name", "username", "user_name", "handle"]);
  const nip05 = readProfileText(profile, ["nip05", "nip_05"]);
  const bits: string[] = [];

  if (name && !isHexLike(name) && name.toLowerCase() !== label.toLowerCase()) {
    bits.push(name);
  }
  if (nip05 && !bits.includes(nip05)) {
    bits.push(nip05);
  }
  if (bits.length === 0 && identifier !== "unknown") {
    bits.push(truncateIdentifier(identifier, "npub", "secondary"));
  }

  return bits.slice(0, 2);
}

function buildSummaryMetrics(profile: Profile) {
  const rawMetrics = extractPrimitiveStats(profile, PROFILE_STAT_EXCLUDE).filter((entry) =>
    /(count|score|rank|followers|following|note|activity|relay|mention|reply|visibility|reach|event|recent|cross)/i.test(
      entry.label
    )
  );
  const selected: Array<{ label: string; value: string | number | boolean }> = [];
  const usedLabels = new Set<string>();

  for (const matcher of PROFILE_METRIC_PRIORITY) {
    const match = rawMetrics.find(
      (entry) => matcher.test(entry.label) && !usedLabels.has(entry.label)
    );
    if (!match) continue;
    selected.push(match);
    usedLabels.add(match.label);
  }

  for (const entry of rawMetrics) {
    if (usedLabels.has(entry.label)) continue;
    selected.push(entry);
    usedLabels.add(entry.label);
    if (selected.length >= 3) break;
  }

  return selected.slice(0, 3);
}

function ProfileDiscoveryRow({ profile, rank }: { profile: Profile; rank: number }) {
  const label = profileLabel(profile);
  const identifier = profileIdentifier(profile);
  const pictureUrl = profilePictureUrl(profile);
  const avatarSrc = pictureUrl ?? profileFallbackAvatarDataUrl(profile);
  const href = identifier !== "unknown" ? `/profiles/${encodeURIComponent(identifier)}` : undefined;
  const identityBits = buildIdentityBits(profile, label, identifier);
  const metrics = buildSummaryMetrics(profile);
  const reasons = mapProfileWhyNow(profile);

  return (
    <li className="py-4 first:pt-0 last:pb-0">
      <div className="flex items-start gap-3">
        <Image
          src={avatarSrc}
          alt={label}
          width={52}
          height={52}
          unoptimized
          className="h-12 w-12 shrink-0 rounded-full border border-zinc-700/80 object-cover"
        />

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-[1.02rem] font-semibold tracking-tight text-zinc-50">
                {label}
              </p>
              {identityBits.length > 0 ? (
                <p className="mt-1 truncate text-xs text-zinc-500">{identityBits.join(" • ")}</p>
              ) : null}
            </div>
            <span className="inline-flex shrink-0 items-center rounded-full border border-white/8 bg-white/[0.03] px-2 py-1 text-[11px] font-medium tracking-[0.18em] text-zinc-400 uppercase">
              #{rank}
            </span>
          </div>

          {typeof profile.about === "string" && profile.about.trim().length > 0 ? (
            <p className="mt-2.5 line-clamp-2 text-sm leading-6 text-zinc-300">
              {profile.about.trim()}
            </p>
          ) : null}

          <DiscoveryStatPills stats={metrics} className="mt-3" />

          <WhyNow reasons={reasons} className="mt-3" />

          <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-zinc-500">
            {identifier !== "unknown" && !href ? (
              <IdBadge
                id={identifier}
                label={identifier.startsWith("npub") ? "npub" : "pubkey"}
                kind={identifier.startsWith("npub") ? "npub" : "pubkey"}
                surface="secondary"
                className="border-zinc-800 bg-zinc-950/50"
              />
            ) : null}
            <DiscoveryActionLinks
              actions={[
                { label: "View profile", href },
                { label: "Recent notes", href: href ? `${href}#authored-notes` : undefined },
              ]}
              className="text-zinc-500"
            />
          </div>
        </div>
      </div>
    </li>
  );
}

export function ProfilesInMotionSpotlight({
  profiles,
  trendWindowLabel,
  freshnessLabel,
}: {
  profiles: Profile[];
  trendWindowLabel: string;
  freshnessLabel: string;
}) {
  return (
    <section className="relative overflow-hidden rounded-[1.6rem] border border-zinc-800/90 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.1),transparent_38%),linear-gradient(180deg,rgba(24,24,27,0.96),rgba(20,20,23,0.92))] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.16)] sm:p-6 xl:p-7">
      <div className="flex h-full flex-col">
        <header className="space-y-3">
          <div className="space-y-2">
            <h2 className="text-[1.4rem] font-semibold tracking-tight text-zinc-50 sm:text-[1.75rem]">
              Profiles in motion
            </h2>
            <p className="max-w-lg text-sm leading-6 text-zinc-400 sm:text-base">
              The profiles gaining the most momentum.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-zinc-400">
            <DiscoveryPill tone="freshness">{trendWindowLabel}</DiscoveryPill>
            <DiscoveryPill tone="freshness">{freshnessLabel}</DiscoveryPill>
          </div>
        </header>

        <div className="mt-6 flex-1">
          {profiles.length > 0 ? (
            <ul className="divide-y divide-zinc-800/75">
              {profiles.map((profile, index) => (
                <ProfileDiscoveryRow
                  key={profile.pubkey ?? profile.npub ?? `profile-highlight-${index}`}
                  profile={profile}
                  rank={index + 1}
                />
              ))}
            </ul>
          ) : (
            <div className="flex min-h-64 items-center">
              <EmptyState
                title="Profile ranking is quiet"
                message="No clear profile movement was returned for this window."
              />
            </div>
          )}
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-zinc-500">
          <Link href="/trending/profiles" className="hover:text-emerald-200">
            See all profiles
          </Link>
        </div>
      </div>
    </section>
  );
}
