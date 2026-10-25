import Link from "next/link";

import {
  cardTierClassName,
  DiscoveryActionLinks,
  DiscoveryStatPills,
} from "@/components/explorer/card-grammar";
import { ProfileAvatar } from "@/components/explorer/profile-avatar";
import { SourceFigure } from "@/components/explorer/source-figure";
import { mapProfileWhyNow, WhyNow } from "@/components/explorer/why-now";
import { RichInlineText } from "@/components/explorer/note-content";
import {
  extractPrimitiveStats,
  formatProfileSecondary,
  profileAboutLine,
  profileHref,
  profileLabel,
  profileSecondaryLabel,
  truncateProfileLabel,
} from "@/components/explorer/utils";
import { searchProfileContextLine } from "@/lib/search/display";
import type { Profile } from "@/lib/types/api";

export function ProfileCard({
  profile,
  rank,
  summary,
  discoverySignals = false,
  maxReasons = 1,
  compact = false,
  searchContext = false,
}: {
  profile: Profile;
  rank?: number;
  summary?: Record<string, unknown>;
  discoverySignals?: boolean;
  /** How many "why" chips to show when `discoverySignals` is on. */
  maxReasons?: number;
  /** One-line bio and no action links, without a rank number. */
  compact?: boolean;
  /** Followers, recent notes, and nip05 for a search hit. */
  searchContext?: boolean;
}) {
  const label = profileLabel(profile);
  const secondaryLabel = profileSecondaryLabel(profile);
  const secondaryText = secondaryLabel ? formatProfileSecondary(secondaryLabel) : "";
  const href = profileHref(profile);
  const rankedRow = typeof rank === "number";
  const quietRow = rankedRow || compact;
  const about = typeof profile.about === "string" ? profileAboutLine(profile.about) : "";
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
  const rankLabel = rankedRow ? String(rank).padStart(2, "0") : null;
  const profileReasons = mapProfileWhyNow(profile);
  const nip05 = typeof profile.nip05 === "string" ? profile.nip05.trim() : "";
  const contextLine = searchContext
    ? searchProfileContextLine(profile, { omitNip05: Boolean(nip05) && secondaryLabel === nip05 })
    : undefined;

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
          <div className="flex min-w-0 items-start justify-between gap-3">
            {href ? (
              <Link
                href={href}
                title={label}
                className="text-ink hover:text-ink-strong block min-w-0 flex-1 truncate text-base font-semibold hover:underline"
              >
                {truncateProfileLabel(label)}
              </Link>
            ) : (
              <p className="text-ink min-w-0 flex-1 truncate text-base font-semibold" title={label}>
                {truncateProfileLabel(label)}
              </p>
            )}
            {rankedRow ? <SourceFigure ranking={profile.ranking} /> : null}
          </div>
          {secondaryText && href ? (
            <Link
              href={href}
              className="text-ink-faint hover:text-ink-muted inline-flex min-h-6 max-w-full items-center truncate text-xs"
              title={secondaryLabel ?? undefined}
            >
              {secondaryText}
            </Link>
          ) : secondaryText ? (
            <p className="text-ink-faint truncate text-xs" title={secondaryLabel ?? undefined}>
              {secondaryText}
            </p>
          ) : null}
          {contextLine ? <p className="text-ink-muted truncate text-xs">{contextLine}</p> : null}
          {about.length > 0 ? (
            quietRow ? (
              <p className="text-ink-dim line-clamp-1 text-sm [overflow-wrap:anywhere]">{about}</p>
            ) : (
              <RichInlineText
                text={about}
                className="text-ink-dim line-clamp-2 text-sm [overflow-wrap:anywhere]"
              />
            )
          ) : null}
        </div>
      </div>

      {discoverySignals ? (
        <WhyNow
          reasons={profileReasons}
          maxReasons={maxReasons}
          showLabel={false}
          className="mt-2.5 sm:mt-3"
        />
      ) : null}

      {quietRow || searchContext ? null : (
        <DiscoveryStatPills stats={metrics} className="mt-2.5 sm:mt-3" />
      )}

      {href && !quietRow ? (
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
