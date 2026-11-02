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
  | "default"
  | "conversations"
  | "rising"
  | "pictures"
  | "videos"
  | "shorts"
  | "live"
  | "zapped"
  | "bookmarked"
  | "followed"
  | "supported";

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
   * `carryWindow` and `carryLanguage` override it when a mode keeps only one.
   */
  windowed?: boolean;
  /** Carry the current stats window. Defaults to `windowed !== false`. */
  carryWindow?: boolean;
  /** Carry the current language. Defaults to `windowed !== false`. */
  carryLanguage?: boolean;
};

/** Which of the current window and language a mode link should copy. */
export function modeLinkCarries(link: DiscoverModeLink): { window: boolean; language: boolean } {
  const bundled = link.windowed !== false;
  return {
    window: link.carryWindow ?? bundled,
    language: link.carryLanguage ?? bundled,
  };
}

export const DISCOVER_MODE_LINKS: Partial<Record<DiscoverView, DiscoverModeLink[]>> = {
  notes: [
    { mode: "default", label: "Notes", href: "/trending/notes" },
    { mode: "zapped", label: "Most zapped", href: "/discovery/notes/zapped" },
    { mode: "conversations", label: "Conversations", href: "/discovery/conversations/hot" },
    {
      mode: "bookmarked",
      label: "Most bookmarked",
      href: "/discovery/notes/bookmarked",
      carryWindow: false,
    },
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
    {
      mode: "followed",
      label: "Most followed",
      href: "/discovery/profiles/followed",
      windowed: false,
    },
    {
      mode: "supported",
      label: "Most supported",
      href: "/discovery/profiles/supported",
      carryLanguage: false,
    },
  ],
};

export function discoverViewLabel(view: DiscoverView): string {
  return DISCOVER_VIEWS.find((candidate) => candidate.key === view)?.label ?? "Discover";
}

export function discoverViewHref(view: DiscoverView): string {
  return DISCOVER_VIEWS.find((candidate) => candidate.key === view)?.href ?? "/";
}
