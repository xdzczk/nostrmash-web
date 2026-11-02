import type { ProfileActivityTab } from "@/lib/profile/activity-tabs";
import type { ProfileStats } from "@/lib/types/api";

export type ActivityEmptyCopy = {
  message: string;
  /** Optional one-line explanation of what the tab would contain. */
  hint?: string;
};

export function activityEmptyCopy(tab: ProfileActivityTab): ActivityEmptyCopy {
  switch (tab) {
    case "notes":
      return { message: "No recent notes from this profile are in the index yet." };
    case "replies":
      return { message: "No recent replies from this profile are in the index yet." };
    case "reactions":
      return {
        message: "No recent reactions from this profile are in the index yet.",
        hint: "Reactions are the likes and emoji responses this account sends to other notes.",
      };
    case "zaps":
      return {
        message: "No recent zaps sent by this profile are in the index yet.",
        hint: "Zaps sent are Lightning tips this account paid. A note’s Zaps count is tips that note received.",
      };
    case "long_form":
      return {
        message: "This profile has not published long-form articles that we have indexed.",
        hint: "Long-form posts are Markdown articles (NIP-23), distinct from short notes.",
      };
    case "media":
      return {
        message: "This profile has not published pictures or videos that we have indexed.",
        hint: "Pictures and videos are NIP-68 and NIP-71 media events.",
      };
    case "bookmarks":
      return {
        message: "No public bookmarks from this profile are in the index yet.",
        hint: "Bookmarks are notes the account saved in its public bookmark list.",
      };
    case "highlights":
      return {
        message: "No highlights from this profile are in the index yet.",
        hint: "Highlights are passages the account clipped from articles or web pages (NIP-84).",
      };
    case "live":
      return {
        message: "This profile has no live activities in the index.",
        hint: "Live activities are NIP-53 streams, including ones that are planned or have ended.",
      };
    case "pins":
      return {
        message: "This profile has not pinned any events that we have indexed.",
        hint: "Pins are the public pin list for this account.",
      };
    case "mute_list":
      return {
        message: "This profile's public mute list is empty or not indexed.",
        hint: "Only public mute lists are shown; encrypted entries are never read.",
      };
    case "muted_by":
      return { message: "No indexed accounts publicly mute this profile." };
  }
}

/**
 * Pick a tab that most likely has content, using the summary's counters, so an
 * empty tab can hand the reader somewhere useful instead of a dead end.
 */
export function suggestActivityTab(
  currentTab: ProfileActivityTab,
  stats: Pick<ProfileStats, "note_count" | "reply_count"> | null | undefined
): ProfileActivityTab | null {
  const candidates: Array<{ tab: ProfileActivityTab; count: number | undefined }> = [
    { tab: "notes", count: stats?.note_count },
    { tab: "replies", count: stats?.reply_count },
  ];
  const withContent = candidates
    .filter((entry) => entry.tab !== currentTab)
    .filter((entry) => typeof entry.count === "number" && entry.count > 0)
    .sort((a, b) => (b.count ?? 0) - (a.count ?? 0));
  if (withContent.length > 0) return withContent[0]?.tab ?? null;
  return currentTab === "notes" ? null : "notes";
}
