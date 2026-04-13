import Image from "next/image";

import { IdBadge } from "@/components/explorer/id-badge";
import {
  cardTierClassName,
  DiscoveryActionLinks,
  DiscoveryPill,
  DiscoveryStatPills,
} from "@/components/explorer/card-grammar";
import { mapProfileWhyNow, WhyNow } from "@/components/explorer/why-now";
import {
  extractPrimitiveStats,
  profileFallbackAvatarDataUrl,
  profileIdentifier,
  profileLabel,
  profilePictureUrl,
  profileSecondaryLabel,
  truncateIdentifier,
} from "@/components/explorer/utils";
import type { Profile } from "@/lib/types/api";

export function ProfileCard({
  profile,
  rank,
  summary,
  discoverySignals = false,
}: {
  profile: Profile;
  rank?: number;
  summary?: Record<string, unknown>;
  discoverySignals?: boolean;
}) {
  const label = profileLabel(profile);
  const secondaryLabel = profileSecondaryLabel(profile);
  const identifier = profileIdentifier(profile);
  const pictureUrl = profilePictureUrl(profile);
  const avatarSrc = pictureUrl ?? profileFallbackAvatarDataUrl(profile);
  const href = identifier !== "unknown" ? `/profiles/${encodeURIComponent(identifier)}` : undefined;
  const rawMetrics = extractPrimitiveStats(summary ?? profile, [
    "pubkey",
    "npub",
    "name",
    "display_name",
    "about",
    "picture",
    "website",
    "nip05",
    "lud16",
  ])
    .filter((entry) =>
      /(count|score|rank|followers|following|note|activity|relay)/i.test(entry.label)
    )
    .slice(0, 6);
  const profileMetricPriority = [
    /new.*follower|follower.*new/i,
    /recent|activity|active/i,
    /note|author|event/i,
    /visibility|reach|relay|mention/i,
  ];
  const metrics = profileMetricPriority
    .map((matcher) => rawMetrics.find((entry) => matcher.test(entry.label)))
    .filter((entry): entry is (typeof rawMetrics)[number] => Boolean(entry))
    .slice(0, 3);
  const isTopRank = typeof rank === "number" && rank <= 3;
  const rankLabel = typeof rank === "number" ? `#${rank}` : null;
  const identifierKind = identifier.startsWith("npub") ? "npub" : "pubkey";
  const secondaryIdentity = secondaryLabel ?? (identifier !== "unknown" ? identifier : null);
  const profileReasons = mapProfileWhyNow(profile);

  return (
    <article
      className={`${cardTierClassName("standard")} ${
        isTopRank ? "border-emerald-500/20 bg-zinc-900/60" : "border-zinc-800/85 bg-zinc-900/45"
      }`}
    >
      <div className="flex items-start gap-3">
        <Image
          src={avatarSrc}
          alt={label}
          width={44}
          height={44}
          unoptimized
          className="h-10 w-10 rounded-full border border-zinc-700 object-cover sm:h-11 sm:w-11"
        />
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex items-start justify-between gap-2">
            <p className="truncate text-base font-semibold text-zinc-100">{label}</p>
            {rankLabel ? (
              <DiscoveryPill
                tone={isTopRank ? "rank" : "freshness"}
                className="shrink-0 px-2 py-0.5 text-[10px]"
              >
                {rankLabel}
              </DiscoveryPill>
            ) : null}
          </div>
          {secondaryIdentity ? (
            <p className="truncate text-xs text-zinc-500" title={secondaryIdentity}>
              {truncateIdentifier(secondaryIdentity, identifierKind, "secondary")}
            </p>
          ) : null}
          {typeof profile.about === "string" && profile.about.length > 0 ? (
            <p className="line-clamp-2 text-sm text-zinc-300">{profile.about}</p>
          ) : null}
        </div>
      </div>

      {discoverySignals ? <WhyNow reasons={profileReasons} className="mt-2.5 sm:mt-3" /> : null}

      <DiscoveryStatPills stats={metrics} className="mt-2.5 sm:mt-3" />

      {href ? (
        <div className="mt-2.5 flex flex-wrap items-center gap-2 text-xs sm:mt-3">
          {identifier !== "unknown" ? (
            <>
              <IdBadge
                id={identifier}
                label={identifierKind}
                kind={identifierKind}
                surface="secondary"
                className="border-zinc-800 bg-zinc-950/60"
              />
            </>
          ) : null}
          <DiscoveryActionLinks
            actions={[
              { label: "View profile", href },
              { label: "Recent notes", href: `${href}#authored-notes` },
              { label: "Related profiles", href: `${href}#related-profiles` },
            ]}
          />
        </div>
      ) : null}
    </article>
  );
}
