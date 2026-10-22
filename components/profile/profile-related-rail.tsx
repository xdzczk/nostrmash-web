import Link from "next/link";

import { ProfileAvatar } from "@/components/explorer/profile-avatar";
import { profileHref, profileLabel, profileSecondaryLabel } from "@/components/explorer/utils";
import { relatedRailReasonLine } from "@/components/explorer/why-now";
import { TabOverflow } from "@/components/ui/tab-overflow";
import type { Profile } from "@/lib/types/api";

const RAIL_LIMIT = 8;

/**
 * One row of people this account actually interacts with. Profiles with no
 * adjacency reason are omitted, except on a labeled trending fallback where
 * the list is not claiming relatedness. Server order is the combined score.
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
      reason: relatedRailReasonLine(profile),
      href: profileHref(profile),
    }))
    .filter((item) => item.href && (allowWithoutReason || item.reason))
    .slice(0, RAIL_LIMIT);

  if (items.length === 0) return null;

  return (
    <TabOverflow className="nm-tab-scroller -mx-1 overflow-x-auto px-1 pb-1">
      <ul className="flex w-max gap-3" data-testid="profile-related-rail">
        {items.map(({ profile, reason, href }) => {
          const name = profileLabel(profile);
          const secondary = profileSecondaryLabel(profile);
          return (
            <li key={profile.pubkey} className="w-40 shrink-0">
              <Link
                href={href!}
                title={reason ?? name}
                className="border-edge/80 hover:bg-surface-hover flex h-full flex-col gap-1.5 rounded-xl border p-2.5"
              >
                <ProfileAvatar
                  profile={profile}
                  size={36}
                  alt=""
                  className="h-9 w-9 rounded-full"
                />
                <span className="min-w-0">
                  <span className="text-ink block truncate text-sm font-medium">{name}</span>
                  {secondary && secondary.toLowerCase() !== name.toLowerCase() ? (
                    <span className="text-ink-faint block truncate text-xs">{secondary}</span>
                  ) : null}
                </span>
                {reason ? (
                  <span className="text-ink-muted mt-auto block truncate text-xs">{reason}</span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </TabOverflow>
  );
}
