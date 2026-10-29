export const DISCOVER_VIEWS = [
  { key: "overview", label: "Overview", href: "/" },
  { key: "notes", label: "Notes", href: "/trending/notes" },
  { key: "media", label: "Media", href: "/trending/pictures" },
  { key: "articles", label: "Articles", href: "/trending/long-form" },
  { key: "people", label: "People", href: "/trending/profiles" },
  { key: "topics", label: "Topics", href: "/trending/hashtags" },
  { key: "links", label: "Links", href: "/trending/domains" },
] as const;

export type DiscoverView = (typeof DISCOVER_VIEWS)[number]["key"];
export type DiscoverMode =
  "default" | "conversations" | "rising" | "pictures" | "videos" | "shorts" | "live";

export type DiscoverContext = {
  view: DiscoverView;
  mode?: DiscoverMode;
};

export type DiscoverModeLink = {
  mode: DiscoverMode;
  label: string;
  href: string;
  /**
   * When false, the mode link stays on the present and does not carry
   * 24h/7d/30d or a language. Live is that case.
   */
  windowed?: boolean;
};

export const DISCOVER_MODE_LINKS: Partial<Record<DiscoverView, DiscoverModeLink[]>> = {
  notes: [
    { mode: "default", label: "Notes", href: "/trending/notes" },
    { mode: "conversations", label: "Conversations", href: "/discovery/conversations/hot" },
  ],
  media: [
    { mode: "pictures", label: "Pictures", href: "/trending/pictures" },
    { mode: "videos", label: "Videos", href: "/trending/videos" },
    { mode: "shorts", label: "Shorts", href: "/trending/shorts" },
    { mode: "live", label: "Live", href: "/live", windowed: false },
  ],
  people: [
    { mode: "default", label: "Trending", href: "/trending/profiles" },
    { mode: "rising", label: "Up and coming", href: "/discovery/profiles/rising" },
  ],
};

export function discoverViewLabel(view: DiscoverView): string {
  return DISCOVER_VIEWS.find((candidate) => candidate.key === view)?.label ?? "Discover";
}

export function discoverViewHref(view: DiscoverView): string {
  return DISCOVER_VIEWS.find((candidate) => candidate.key === view)?.href ?? "/";
}
