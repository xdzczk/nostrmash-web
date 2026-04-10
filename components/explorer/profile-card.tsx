import Image from "next/image";
import Link from "next/link";

import {
  extractPrimitiveStats,
  formatMetricLabel,
  profileFallbackAvatarDataUrl,
  profileIdentifier,
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
    profileReasons.push("posting momentum");
  }
  if (hasVisibilitySignal) {
    profileReasons.push("wider visibility");
  }
  if (hasNetworkAttentionSignal) {
    profileReasons.push("network attention");
  }
  if (profileReasons.length === 0) {
    profileReasons.push("gaining traction");
  }

  return (
    <article
      className={`rounded-[1.15rem] border p-4 sm:p-5 ${
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
              <span
                className={`shrink-0 text-[11px] font-medium ${
                  isTopRank ? "text-emerald-300" : "text-zinc-500"
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
        <div className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-zinc-400 sm:mt-3">
          <span className="text-zinc-500">Why now</span>
          <span className="text-zinc-600">•</span>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            {profileReasons.slice(0, 2).map((reason, index) => (
              <span key={reason} className="inline-flex items-center gap-2">
                {index > 0 ? <span className="text-zinc-600">•</span> : null}
                <span>{reason}</span>
              </span>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-300 sm:mt-3">
        {metrics.map((metric) => (
          <span key={metric.label} className="inline-flex items-center gap-1.5">
            <span className="text-zinc-500">{formatMetricLabel(metric.label)}</span>
            <span className="font-medium text-zinc-100">{String(metric.value)}</span>
          </span>
        ))}
      </div>

      {identifier !== "unknown" ? (
        <div className="mt-2.5 text-xs text-zinc-500 sm:mt-3">
          {identifier.startsWith("npub") ? "npub" : "pubkey"} {identifier}
        </div>
      ) : null}

      {href ? (
        <div className="mt-2.5 flex flex-wrap items-center gap-2 text-xs sm:mt-3">
          <Link href={href} className="text-indigo-300 hover:text-indigo-200">
            View profile
          </Link>
          <span className="text-zinc-600">•</span>
          <Link href={`${href}#authored-notes`} className="text-indigo-300 hover:text-indigo-200">
            Recent notes
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
