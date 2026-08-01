import Link from "next/link";

import {
  cardTierClassName,
  DiscoveryActionLinks,
  DiscoveryStatPills,
} from "@/components/explorer/card-grammar";
import { ProfileAvatar } from "@/components/explorer/profile-avatar";
import { mapProfileWhyNow, WhyNow } from "@/components/explorer/why-now";
import {
  extractPrimitiveStats,
  profileHref,
  profileIdentifier,
  profileLabel,
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
  const href = profileHref(profile);
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
    .slice(0, 2);
  const isTopRank = typeof rank === "number" && rank <= 3;
  const rankLabel = typeof rank === "number" ? String(rank).padStart(2, "0") : null;
  const identifierKind = identifier.startsWith("npub") ? "npub" : "pubkey";
  const secondaryIdentity = secondaryLabel ?? (identifier !== "unknown" ? identifier : null);
  const profileReasons = mapProfileWhyNow(profile);

  return (
    <article
      className={`group ${cardTierClassName("standard")} ${
        isTopRank ? "border-accent-soft/40" : "border-edge/70"
      }`}
    >
      <div className="flex items-start gap-3">
        {rankLabel ? (
          <span className="text-accent-ink w-7 shrink-0 pt-2 text-lg leading-none tracking-[-0.05em] tabular-nums">
            {rankLabel}
          </span>
        ) : null}
        <ProfileAvatar
          profile={profile}
          size={44}
          href={href}
          className="border-edge-strong h-10 w-10 rounded-full border object-cover sm:h-11 sm:w-11"
        />
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex items-start justify-between gap-2">
            {href ? (
              <Link
                href={href}
                className="text-ink hover:text-ink-strong truncate text-base font-semibold"
              >
                {label}
              </Link>
            ) : (
              <p className="text-ink truncate text-base font-semibold">{label}</p>
            )}
          </div>
          {secondaryIdentity && href ? (
            <Link
              href={href}
              className="text-ink-faint hover:text-ink-muted truncate text-xs"
              title={secondaryIdentity}
            >
              {truncateIdentifier(secondaryIdentity, identifierKind, "secondary")}
            </Link>
          ) : secondaryIdentity ? (
            <p className="text-ink-faint truncate text-xs" title={secondaryIdentity}>
              {truncateIdentifier(secondaryIdentity, identifierKind, "secondary")}
            </p>
          ) : null}
          {typeof profile.about === "string" && profile.about.length > 0 ? (
            <p className="text-ink-dim line-clamp-2 text-sm">{profile.about}</p>
          ) : null}
        </div>
      </div>

      {discoverySignals ? (
        <WhyNow reasons={profileReasons} showLabel={false} className="mt-2.5 sm:mt-3" />
      ) : null}

      <DiscoveryStatPills stats={metrics} className="mt-2.5 sm:mt-3" />

      {href ? (
        <div className="mt-2.5 flex flex-wrap items-center gap-2 text-xs sm:mt-3">
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
