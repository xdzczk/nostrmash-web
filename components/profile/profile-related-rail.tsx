import Link from "next/link";

import { ProfileAvatar } from "@/components/explorer/profile-avatar";
import { profileHref, profileLabel, profileSecondaryLabel } from "@/components/explorer/utils";
import { mapRelatedProfileReasons } from "@/components/explorer/why-now";
import type { Profile } from "@/lib/types/api";

const RAIL_LIMIT = 8;

/**
 * One row of people this account actually interacts with. Profiles with no
 * adjacency reason are omitted, except on a labeled trending fallback where
 * the list is not claiming relatedness.
 */
export function ProfileRelatedRail({
  profiles,
  allowWithoutReason = false,
}: {
  profiles: Profile[];
  allowWithoutReason?: boolean;
}) {
  const items = profiles
    .map((profile) => ({
      profile,
      reason: mapRelatedProfileReasons(profile)[0],
      href: profileHref(profile),
    }))
    .filter((item) => item.href && (allowWithoutReason || item.reason))
    .slice(0, RAIL_LIMIT);

  if (items.length === 0) return null;

  return (
    <ul className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-1" data-testid="profile-related-rail">
      {items.map(({ profile, reason, href }) => {
        const name = profileLabel(profile);
        const secondary = profileSecondaryLabel(profile);
        const about = typeof profile.about === "string" ? profile.about.trim() : "";
        const reasonText = reason
          ? reason.support
            ? `${reason.text} · ${reason.support}`
            : reason.text
          : null;
        return (
          <li key={profile.pubkey} className="w-44 shrink-0">
            <Link
              href={href!}
              className="border-edge/80 hover:bg-surface-hover flex h-full flex-col gap-2 rounded-xl border p-3"
            >
              <ProfileAvatar profile={profile} size={40} className="h-10 w-10 rounded-full" />
              <span className="min-w-0">
                <span className="text-ink block truncate text-sm font-medium">{name}</span>
                {secondary && secondary.toLowerCase() !== name.toLowerCase() ? (
                  <span className="text-ink-faint block truncate text-xs">{secondary}</span>
                ) : null}
              </span>
              {about ? (
                <span className="text-ink-dim line-clamp-1 text-xs leading-5">{about}</span>
              ) : null}
              {reasonText ? (
                <span className="text-ink-muted mt-auto text-xs leading-5">{reasonText}</span>
              ) : null}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
