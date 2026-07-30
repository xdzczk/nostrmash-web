export const DISCOVER_VIEWS = [
  { key: "overview", label: "Overview", href: "/" },
  { key: "notes", label: "Notes", href: "/trending/notes" },
  { key: "conversations", label: "Conversations", href: "/discovery/conversations/hot" },
  { key: "people", label: "People", href: "/trending/profiles" },
  { key: "topics", label: "Topics", href: "/trending/hashtags" },
  { key: "links", label: "Links", href: "/trending/domains" },
] as const;

export type DiscoverView = (typeof DISCOVER_VIEWS)[number]["key"];
export type DiscoverMode = "default" | "long-form" | "rising" | "hot";

export type DiscoverContext = {
  view: DiscoverView;
  mode?: DiscoverMode;
};

export const DISCOVER_MODE_LINKS: Partial<
  Record<DiscoverView, Array<{ mode: DiscoverMode; label: string; href: string }>>
> = {
  notes: [
    { mode: "default", label: "Notes", href: "/trending/notes" },
    { mode: "long-form", label: "Long-form", href: "/trending/long-form" },
  ],
  conversations: [
    {
      mode: "hot",
      label: "Hot conversations",
      href: "/discovery/conversations/hot",
    },
  ],
  people: [
    { mode: "default", label: "Trending", href: "/trending/profiles" },
    { mode: "rising", label: "Rising", href: "/discovery/profiles/rising" },
  ],
};

export function discoverViewLabel(view: DiscoverView): string {
  return DISCOVER_VIEWS.find((candidate) => candidate.key === view)?.label ?? "Discover";
}

export function discoverViewHref(view: DiscoverView): string {
  return DISCOVER_VIEWS.find((candidate) => candidate.key === view)?.href ?? "/";
}
