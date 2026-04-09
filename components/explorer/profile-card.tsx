import Image from "next/image";
import Link from "next/link";

import { IdBadge } from "@/components/explorer/id-badge";
import {
  extractPrimitiveStats,
  formatMetricLabel,
  profileIdentifier,
  profileInitial,
  profileLabel,
  profileSecondaryLabel,
} from "@/components/explorer/utils";
import type { Profile } from "@/lib/types/api";

export function ProfileCard({
  profile,
  rank,
  summary,
}: {
  profile: Profile;
  rank?: number;
  summary?: Record<string, unknown>;
}) {
  const label = profileLabel(profile);
  const secondaryLabel = profileSecondaryLabel(profile);
  const identifier = profileIdentifier(profile);
  const href = identifier !== "unknown" ? `/profiles/${encodeURIComponent(identifier)}` : undefined;
  const metrics = extractPrimitiveStats(summary ?? profile, [
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
    .slice(0, 3);
  const isTopRank = typeof rank === "number" && rank <= 3;
  const rankLabel = typeof rank === "number" ? `#${rank}` : null;

  return (
    <article
      className={`rounded-xl border p-3 sm:p-4 ${
        isTopRank ? "border-zinc-700 bg-zinc-900/65" : "border-zinc-800 bg-zinc-900/50"
      }`}
    >
      <div className="flex items-start gap-3">
        {typeof profile.picture === "string" && profile.picture.length > 0 ? (
          <Image
            src={profile.picture}
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
            Open profile
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
