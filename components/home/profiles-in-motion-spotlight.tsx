import Image from "next/image";
import Link from "next/link";

import { DiscoveryActionLinks, DiscoveryStatPills } from "@/components/explorer/card-grammar";
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

  return selected.slice(0, 2);
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
    <li className="group py-4 first:pt-0 last:pb-0">
      <div className="flex items-start gap-3">
        <Image
          src={avatarSrc}
          alt={label}
          width={52}
          height={52}
          className="border-edge-strong/80 h-12 w-12 shrink-0 rounded-full border object-cover"
        />

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-ink-strong truncate text-[1.02rem] font-semibold tracking-tight">
                {label}
              </p>
              {identityBits.length > 0 ? (
                <p className="text-ink-faint mt-1 truncate text-xs">{identityBits.join(" • ")}</p>
              ) : null}
            </div>
            <span className="text-ink-muted border-edge bg-surface-sunken/40 inline-flex shrink-0 items-center rounded-full border px-2 py-1 text-[11px] font-medium tracking-[0.18em] uppercase">
              #{rank}
            </span>
          </div>

          {typeof profile.about === "string" && profile.about.trim().length > 0 ? (
            <p className="text-ink-dim mt-2.5 line-clamp-2 text-sm leading-6">
              {profile.about.trim()}
            </p>
          ) : null}

          <DiscoveryStatPills stats={metrics} className="mt-3" />

          <WhyNow reasons={reasons} maxReasons={1} showLabel={false} className="mt-2" />

          <div className="text-ink-faint mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs opacity-80 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
            {identifier !== "unknown" && !href ? (
              <IdBadge
                id={identifier}
                label={identifier.startsWith("npub") ? "npub" : "pubkey"}
                kind={identifier.startsWith("npub") ? "npub" : "pubkey"}
                surface="secondary"
                className="border-edge bg-surface-sunken/50"
              />
            ) : null}
            <DiscoveryActionLinks
              actions={[
                { label: "View profile", href },
                { label: "Recent notes", href: href ? `${href}#authored-notes` : undefined },
              ]}
              className="text-ink-faint"
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
    <section className="border-edge/90 nm-panel-emerald relative overflow-hidden rounded-[1.6rem] border p-5 sm:p-6 xl:p-7">
      <div className="flex h-full flex-col">
        <header className="space-y-3">
          <div className="space-y-2">
            <h2 className="nm-title text-ink-strong">Profiles in motion</h2>
            <p className="text-ink-muted max-w-lg text-sm leading-6 sm:text-base">
              The profiles gaining the most momentum.
            </p>
          </div>
          <div className="text-ink-muted flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
            <span>{trendWindowLabel}</span>
            <span aria-hidden className="text-ink-faint/70">
              •
            </span>
            <span>{freshnessLabel}</span>
          </div>
        </header>

        <div className="mt-6 flex-1">
          {profiles.length > 0 ? (
            <ul className="divide-edge/75 divide-y">
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

        <div className="text-ink-faint mt-5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
          <Link href="/trending/profiles" className="hover:text-success-ink">
            See all profiles
          </Link>
        </div>
      </div>
    </section>
  );
}
