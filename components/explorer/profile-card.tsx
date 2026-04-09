import Image from "next/image";
import Link from "next/link";

import { IdBadge } from "@/components/explorer/id-badge";
import {
  extractPrimitiveStats,
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
    .slice(0, 4);

  return (
    <article className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
      <div className="flex items-start gap-3">
        {typeof profile.picture === "string" && profile.picture.length > 0 ? (
          <Image
            src={profile.picture}
            alt={label}
            width={44}
            height={44}
            unoptimized
            className="h-11 w-11 rounded-full border border-zinc-700 object-cover"
          />
        ) : (
          <div className="flex h-11 w-11 items-center justify-center rounded-full border border-zinc-700 bg-zinc-900 text-xs text-zinc-500">
            {profileInitial(profile)}
          </div>
        )}
        <div className="min-w-0 flex-1 space-y-1">
          <p className="truncate text-sm font-medium text-zinc-100">
            {typeof rank === "number" ? `${rank}. ` : ""}
            {label}
          </p>
          {secondaryLabel ? (
            <p className="text-xs break-all text-zinc-500">{secondaryLabel}</p>
          ) : (
            <p className="text-xs break-all text-zinc-500">{identifier}</p>
          )}
          {typeof profile.about === "string" && profile.about.length > 0 ? (
            <p className="line-clamp-2 text-sm text-zinc-300">{profile.about}</p>
          ) : null}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {identifier !== "unknown" ? (
          <IdBadge id={identifier} label={identifier.startsWith("npub") ? "npub" : "pubkey"} />
        ) : null}
        {metrics.map((metric) => (
          <span
            key={metric.label}
            className="rounded-full border border-zinc-700 bg-zinc-900/80 px-2 py-1 text-[11px] text-zinc-300"
          >
            {metric.label}: {String(metric.value)}
          </span>
        ))}
      </div>

      {href ? (
        <Link
          href={href}
          className="mt-3 inline-block text-xs text-indigo-300 hover:text-indigo-200"
        >
          Open profile
        </Link>
      ) : null}
    </article>
  );
}
