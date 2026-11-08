import type { DiscoverMode, DiscoverView } from "@/lib/discover/views";

const VIEW_ANCHOR: Record<DiscoverView, string> = {
  overview: "ranking-orders",
  notes: "notes",
  media: "pictures",
  articles: "articles",
  people: "people",
  topics: "topics",
  links: "links",
};

const MODE_ANCHOR: Partial<Record<DiscoverMode, string>> = {
  conversations: "conversations",
  zapped: "most-zapped",
  bookmarked: "most-bookmarked",
  pictures: "pictures",
  videos: "videos",
  shorts: "shorts",
  live: "live",
  rising: "rising",
  supported: "most-supported",
  followed: "most-followed",
};

export function methodologyHref(view: DiscoverView, mode: DiscoverMode = "default"): string {
  const anchor = (mode !== "default" && MODE_ANCHOR[mode]) || VIEW_ANCHOR[view];
  return `/methodology#${anchor}`;
}
