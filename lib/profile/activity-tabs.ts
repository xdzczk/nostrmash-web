import { buildContinuationHref } from "@/lib/search-params/pagination";

/**
 * `secondary` tabs are lower-traffic lists; the tab bar folds them into a
 * "More" menu so the primary row stays scannable on narrow screens.
 */
export const PROFILE_ACTIVITY_TABS = [
  { id: "notes", label: "Notes", secondary: false },
  { id: "replies", label: "Replies", secondary: false },
  { id: "reactions", label: "Reactions", secondary: false },
  { id: "zaps", label: "Zaps sent", secondary: false },
  { id: "long_form", label: "Articles", secondary: false },
  { id: "media", label: "Media", secondary: false },
  { id: "bookmarks", label: "Bookmarks", secondary: true },
  { id: "highlights", label: "Highlights", secondary: true },
  { id: "live", label: "Live", secondary: true },
  { id: "pins", label: "Pins", secondary: true },
  { id: "mute_list", label: "Mute list", secondary: true },
  { id: "muted_by", label: "Muted by", secondary: true },
] as const;

export type ProfileActivityTab = (typeof PROFILE_ACTIVITY_TABS)[number]["id"];

export function isSecondaryProfileActivityTab(tab: ProfileActivityTab): boolean {
  return PROFILE_ACTIVITY_TABS.find((entry) => entry.id === tab)?.secondary ?? false;
}

const PROFILE_ACTIVITY_TAB_SET = new Set<string>(PROFILE_ACTIVITY_TABS.map((tab) => tab.id));

export function parseProfileActivityTab(value: string | undefined): ProfileActivityTab {
  if (value && PROFILE_ACTIVITY_TAB_SET.has(value)) {
    return value as ProfileActivityTab;
  }
  return "notes";
}

export function profileActivityCursorKey(tab: ProfileActivityTab): string {
  switch (tab) {
    case "notes":
      return "notes_cursor";
    case "replies":
      return "replies_cursor";
    case "reactions":
      return "reactions_cursor";
    case "zaps":
      return "zaps_cursor";
    case "long_form":
      return "long_form_cursor";
    case "media":
      return "media_cursor";
    case "bookmarks":
      return "bookmarks_cursor";
    case "highlights":
      return "highlights_cursor";
    case "live":
      return "live_cursor";
    case "pins":
      return "pins_cursor";
    case "mute_list":
      return "mute_list_cursor";
    case "muted_by":
      return "muted_by_cursor";
  }
}

export function buildProfileActivityTabHref(
  route: string,
  searchParams: URLSearchParams,
  tab: ProfileActivityTab
): string {
  const next = new URLSearchParams(searchParams);
  next.set("activity", tab);
  const query = next.toString();
  return query.length > 0 ? `${route}?${query}` : route;
}

export function buildProfileActivityContinuationHref(
  route: string,
  searchParams: URLSearchParams,
  tab: ProfileActivityTab,
  cursor?: string
): string {
  return buildContinuationHref(route, searchParams, profileActivityCursorKey(tab), cursor);
}
