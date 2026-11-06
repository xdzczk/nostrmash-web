import { buildContinuationHref } from "@/lib/search-params/pagination";

export const PROFILE_INSIGHT_TABS = [
  { id: "graph", label: "Graph" },
  { id: "zap_stats", label: "Zaps" },
  { id: "moderation", label: "Moderation" },
  { id: "identities", label: "Identities" },
] as const;

export const PROFILE_CONTENT_TABS = [
  { id: "notes", label: "Notes" },
  { id: "replies", label: "Replies" },
  { id: "reactions", label: "Reactions" },
  { id: "zaps", label: "Zaps sent" },
  { id: "long_form", label: "Articles" },
  { id: "media", label: "Media" },
  { id: "highlights", label: "Highlights" },
  { id: "bookmarks", label: "Bookmarks" },
  { id: "pins", label: "Pins" },
  { id: "live", label: "Live" },
] as const;

export const PROFILE_LIST_TABS = [
  { id: "interests", label: "Interests" },
  { id: "lists", label: "Lists" },
  { id: "labels", label: "Labels" },
  { id: "mute_list", label: "Mute list" },
  { id: "muted_by", label: "Muted by" },
] as const;

/** Every profile tab. Content first, then lists, then insights. */
export const PROFILE_ACTIVITY_TABS = [
  ...PROFILE_CONTENT_TABS,
  ...PROFILE_LIST_TABS,
  ...PROFILE_INSIGHT_TABS,
] as const;

export type ProfileActivityTab = (typeof PROFILE_ACTIVITY_TABS)[number]["id"];

const PROFILE_SURFACE_TABS = new Set<ProfileActivityTab>([
  "interests",
  "lists",
  "labels",
  "identities",
  "moderation",
  "graph",
]);

const CONTENT_TABS = new Set<string>(PROFILE_CONTENT_TABS.map((tab) => tab.id));
const INSIGHT_TABS = new Set<string>(PROFILE_INSIGHT_TABS.map((tab) => tab.id));
const LIST_TABS = new Set<string>(PROFILE_LIST_TABS.map((tab) => tab.id));

export function isProfileSurfaceTab(tab: ProfileActivityTab): boolean {
  return PROFILE_SURFACE_TABS.has(tab);
}

export function isProfileContentTab(tab: ProfileActivityTab): boolean {
  return CONTENT_TABS.has(tab);
}

export function isProfileInsightTab(tab: ProfileActivityTab): boolean {
  return INSIGHT_TABS.has(tab);
}

export function isProfileListTab(tab: ProfileActivityTab): boolean {
  return LIST_TABS.has(tab);
}

/** Content tabs are all visible. Nothing folds into a More menu. */
export function isSecondaryProfileActivityTab(_tab: ProfileActivityTab): boolean {
  return false;
}

const PROFILE_ACTIVITY_TAB_SET = new Set<string>(PROFILE_ACTIVITY_TABS.map((tab) => tab.id));

export function parseProfileActivityTab(value: string | undefined): ProfileActivityTab {
  if (value && PROFILE_ACTIVITY_TAB_SET.has(value)) {
    return value as ProfileActivityTab;
  }
  return "notes";
}

export function profileContentTab(tab: ProfileActivityTab): ProfileActivityTab {
  return isProfileContentTab(tab) ? tab : "notes";
}

/** Tab whose list the profile request should load. Insights keep the notes feed. */
export function profileFetchedTab(tab: ProfileActivityTab): ProfileActivityTab {
  if (isProfileContentTab(tab) || tab === "mute_list" || tab === "muted_by") return tab;
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
    case "interests":
      return "interests_cursor";
    case "lists":
      return "lists_cursor";
    case "labels":
      return "labels_cursor";
    case "identities":
      return "identities_cursor";
    case "moderation":
      return "moderation_cursor";
    case "graph":
    case "zap_stats":
      return "graph_cursor";
  }
}

export function buildProfileActivityTabHref(
  route: string,
  searchParams: URLSearchParams,
  tab: ProfileActivityTab
): string {
  const next = new URLSearchParams(searchParams);
  next.delete("activity");
  if (tab === "notes") next.delete("tab");
  else next.set("tab", tab);
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
