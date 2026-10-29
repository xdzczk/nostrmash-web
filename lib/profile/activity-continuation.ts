import type { ProfileActivityTab } from "@/lib/profile/activity-tabs";

const TOKEN_PREFIX = "p1:";
const MAX_TOKEN_LENGTH = 4096;

/** Wraps an API cursor with the first item already on screen, so a repeated page stops. */
export function encodeProfileContinuation(cursor: string, anchor: string): string {
  return `${TOKEN_PREFIX}${encodeURIComponent(anchor)}:${cursor}`;
}

export function parseProfileContinuation(token: string): { cursor: string; anchor: string } | null {
  if (
    typeof token !== "string" ||
    !token.startsWith(TOKEN_PREFIX) ||
    token.length > MAX_TOKEN_LENGTH
  ) {
    return null;
  }
  const rest = token.slice(TOKEN_PREFIX.length);
  const colon = rest.indexOf(":");
  if (colon < 0) return null;
  let anchor = "";
  try {
    anchor = decodeURIComponent(rest.slice(0, colon));
  } catch {
    return null;
  }
  const cursor = rest.slice(colon + 1).trim();
  if (!cursor || cursor.length > 2048 || anchor.length > 256) return null;
  return { cursor, anchor };
}

type ActivitySlice = {
  activityTab: ProfileActivityTab;
  notes: Array<{ id?: string }>;
  replies: Array<{ id?: string }>;
  reactions: Array<{ event_id?: string; target_event_id?: string }>;
  zaps: Array<{ event_id?: string; target_event_id?: string }>;
  longFormArticles: Array<{ id?: string }>;
  mediaEvents: Array<{ id?: string }>;
  liveEvents: Array<{ id?: string }>;
  pins: Array<{ value?: string }>;
  bookmarks: Array<{ id?: string }>;
  highlights: Array<{ id?: string }>;
  mutedProfiles: Array<{ pubkey?: string }>;
  mutedByProfiles: Array<{ pubkey?: string }>;
};

export function profileActivityHasItems(data: ActivitySlice): boolean {
  switch (data.activityTab) {
    case "notes":
      return data.notes.length > 0;
    case "replies":
      return data.replies.length > 0;
    case "reactions":
      return data.reactions.length > 0;
    case "zaps":
      return data.zaps.length > 0;
    case "long_form":
      return data.longFormArticles.length > 0;
    case "media":
      return data.mediaEvents.length > 0;
    case "bookmarks":
      return data.bookmarks.length > 0;
    case "highlights":
      return data.highlights.length > 0;
    case "live":
      return data.liveEvents.length > 0;
    case "pins":
      return data.pins.length > 0;
    case "mute_list":
      return data.mutedProfiles.length > 0;
    case "muted_by":
      return data.mutedByProfiles.length > 0;
  }
}

export function profileActivityAnchor(data: ActivitySlice): string {
  switch (data.activityTab) {
    case "notes":
      return data.notes[0]?.id ?? "";
    case "replies":
      return data.replies[0]?.id ?? "";
    case "reactions":
      return data.reactions[0]?.event_id || data.reactions[0]?.target_event_id || "";
    case "zaps":
      return data.zaps[0]?.event_id || data.zaps[0]?.target_event_id || "";
    case "long_form":
      return data.longFormArticles[0]?.id ?? "";
    case "media":
      return data.mediaEvents[0]?.id ?? "";
    case "bookmarks":
      return data.bookmarks[0]?.id ?? "";
    case "highlights":
      return data.highlights[0]?.id ?? "";
    case "live":
      return data.liveEvents[0]?.id ?? "";
    case "pins":
      return data.pins[0]?.value ?? "";
    case "mute_list":
      return data.mutedProfiles[0]?.pubkey ?? "";
    case "muted_by":
      return data.mutedByProfiles[0]?.pubkey ?? "";
  }
}
