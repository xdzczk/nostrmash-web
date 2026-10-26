"use server";

import type { LoadMoreChunk } from "@/components/data/load-more-list";
import { ProfileActivityFeed } from "@/components/profile/profile-activity-feed";
import {
  encodeProfileContinuation,
  parseProfileContinuation,
  profileActivityAnchor,
  profileActivityHasItems,
} from "@/lib/profile/activity-continuation";
import {
  parseProfileActivityTab,
  profileActivityCursorKey,
  PROFILE_ACTIVITY_TABS,
  type ProfileActivityTab,
} from "@/lib/profile/activity-tabs";
import { loadProfileActivityData } from "@/lib/profile/load-profile-page-data";
import { isValidPubkeyOrNpubParam, resolvePubkeyParam } from "@/lib/routing/params";

const ACTIVITY_TABS = new Set<string>(PROFILE_ACTIVITY_TABS.map((tab) => tab.id));

function isActivityTab(value: string): value is ProfileActivityTab {
  return ACTIVITY_TABS.has(value);
}

/**
 * Next page of one profile activity tab. Notes, reactions, and zaps already
 * return `next_cursor`; other tabs stop when the API does not.
 */
export async function loadMoreProfileActivity(
  pubkey: string,
  tab: string,
  token: string
): Promise<LoadMoreChunk> {
  if (!isActivityTab(tab) || !isValidPubkeyOrNpubParam(pubkey)) return { content: null };
  const parsed = parseProfileContinuation(token);
  if (!parsed) return { content: null };
  const lookupKey = resolvePubkeyParam(pubkey) ?? pubkey.trim();
  const activityTab = parseProfileActivityTab(tab);

  let cursor = parsed.cursor;
  let previousAnchor = parsed.anchor;

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const data = await loadProfileActivityData(
      {
        lookupKey,
        profile: { pubkey: lookupKey },
        profileRoute: `/profiles/${encodeURIComponent(lookupKey)}`,
        summaryRecord: null,
      },
      {
        activity: activityTab,
        [profileActivityCursorKey(activityTab)]: cursor,
      },
      { focused: true }
    );
    const anchor = profileActivityAnchor(data);
    if (previousAnchor && anchor && anchor === previousAnchor) return { content: null };
    const nextCursor = data.activeNextCursor;
    if (profileActivityHasItems(data)) {
      const advanced =
        typeof nextCursor === "string" && nextCursor.length > 0 && nextCursor !== cursor
          ? encodeProfileContinuation(nextCursor, anchor || previousAnchor)
          : undefined;
      return {
        content: <ProfileActivityFeed data={data} />,
        nextCursor: advanced,
      };
    }
    if (!nextCursor || nextCursor === cursor) return { content: null };
    cursor = nextCursor;
    if (anchor) previousAnchor = anchor;
  }

  return { content: null };
}
