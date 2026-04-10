import Image from "next/image";
import Link from "next/link";

import { IdBadge } from "@/components/explorer/id-badge";
import {
  extractPrimitiveStats,
  formatMetricLabel,
  profileIdentifier,
  profileInitial,
  profileLabel,
  profilePictureUrl,
  profileSecondaryLabel,
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
  const hasMomentumSignal = metrics.some((metric) =>
    /(activity|note|event|recent|author)/i.test(metric.label)
  );
  const hasVisibilitySignal = metrics.some((metric) =>
    /(relay|mention|visibility|impression|cross|reach)/i.test(metric.label)
  );
  const hasNetworkAttentionSignal = metrics.some((metric) =>
    /(follower|following|score|rank|trust)/i.test(metric.label)
  );
  const profileReasons: string[] = [];
  if (hasMomentumSignal) {
    profileReasons.push("authoring momentum");
  }
  if (hasVisibilitySignal) {
    profileReasons.push("cross-note visibility");
  }
  if (hasNetworkAttentionSignal) {
    profileReasons.push("network attention");
  }
  if (profileReasons.length === 0) {
    profileReasons.push("active in current trend window");
  }

  return (
    <article
      className={`rounded-xl border p-3 sm:p-4 ${
        isTopRank ? "border-zinc-700 bg-zinc-900/65" : "border-zinc-800 bg-zinc-900/50"
      }`}
    >
      <div className="flex items-start gap-3">
        {pictureUrl ? (
          <Image
            src={pictureUrl}
            alt={label}
            width={44}
            height={44}
            unoptimized
            className="h-10 w-10 rounded-full border border-zinc-700 object-cover sm:h-11 sm:w-11"
          />
        ) : (
          <div className="flex h-10 w-10 items-center justify-center rounded-full border border-zinc-700 bg-zinc-900 text-xs text-zinc-500 sm:h-11 sm:w-11">
            {profileInitial(profile)}
          </div>
        )}
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex items-start justify-between gap-2">
            <p className="truncate text-base font-semibold text-zinc-100">{label}</p>
            {rankLabel ? (
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                  isTopRank
                    ? "border border-indigo-500/40 bg-indigo-500/10 text-indigo-300"
                    : "border border-zinc-700 text-zinc-400"
                }`}
              >
                {rankLabel}
              </span>
            ) : null}
          </div>
          <p className="text-xs break-all text-zinc-500">{secondaryLabel ?? identifier}</p>
          {typeof profile.about === "string" && profile.about.length > 0 ? (
            <p className="line-clamp-2 text-sm text-zinc-300">{profile.about}</p>
          ) : null}
        </div>
      </div>

      {discoverySignals ? (
        <div className="mt-2.5 space-y-1 sm:mt-3">
          <p className="text-[11px] tracking-[0.14em] text-zinc-500 uppercase">Why this profile</p>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-zinc-400">
            {profileReasons.slice(0, 2).map((reason, index) => (
              <span key={reason} className="inline-flex items-center gap-2">
                {index > 0 ? <span className="text-zinc-600">•</span> : null}
                <span>{reason}</span>
              </span>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-2.5 grid gap-2 text-xs text-zinc-300 sm:mt-3 sm:grid-cols-3">
        {metrics.map((metric) => (
          <div
            key={metric.label}
            className="rounded-md border border-zinc-800/90 bg-zinc-950/20 px-2 py-1.5"
          >
            <p className="text-[11px] tracking-wide text-zinc-500 uppercase">
              {formatMetricLabel(metric.label)}
            </p>
            <p className="mt-0.5 text-sm text-zinc-200">{String(metric.value)}</p>
          </div>
        ))}
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-2 sm:mt-3">
        {identifier !== "unknown" ? (
          <IdBadge id={identifier} label={identifier.startsWith("npub") ? "npub" : "pubkey"} />
        ) : null}
      </div>

      {href ? (
        <div className="mt-2.5 flex flex-wrap items-center gap-2 text-xs sm:mt-3">
          <Link href={href} className="text-indigo-300 hover:text-indigo-200">
            View profile
          </Link>
          <span className="text-zinc-600">•</span>
          <Link href={`${href}#authored-notes`} className="text-indigo-300 hover:text-indigo-200">
            Authored notes
          </Link>
          <span className="text-zinc-600">•</span>
          <Link href={`${href}#related-profiles`} className="text-indigo-300 hover:text-indigo-200">
            Related profiles
          </Link>
        </div>
      ) : null}
    </article>
  );
}
