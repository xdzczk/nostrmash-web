import { buildContinuationHref } from "@/lib/search-params/pagination";

export const PROFILE_ACTIVITY_TABS = [
  { id: "notes", label: "Recent notes" },
  { id: "replies", label: "Recent replies" },
  { id: "reactions", label: "Recent reactions" },
  { id: "zaps", label: "Recent zaps" },
  { id: "long_form", label: "Long-form" },
  { id: "bookmarks", label: "Bookmarks" },
  { id: "highlights", label: "Highlights" },
  { id: "mute_list", label: "Mute list" },
  { id: "muted_by", label: "Muted by" },
] as const;

export type ProfileActivityTab = (typeof PROFILE_ACTIVITY_TABS)[number]["id"];

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
    case "bookmarks":
      return "bookmarks_cursor";
    case "highlights":
      return "highlights_cursor";
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
