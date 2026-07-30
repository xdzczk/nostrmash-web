import { TabBar } from "@/components/ui/tabs";

const DISCOVER_VIEWS = [
  { key: "overview", label: "Overview", href: "/" },
  { key: "notes", label: "Notes", href: "/trending/notes" },
  { key: "conversations", label: "Conversations", href: "/discovery/conversations/hot" },
  { key: "people", label: "People", href: "/trending/profiles" },
  { key: "topics", label: "Topics", href: "/trending/hashtags" },
  { key: "links", label: "Links", href: "/trending/domains" },
] as const;

export type DiscoverView = (typeof DISCOVER_VIEWS)[number]["key"];

export function DiscoverNav({ active }: { active: DiscoverView }) {
  return (
    <TabBar
      ariaLabel="Discover categories"
      items={DISCOVER_VIEWS.map((view) => ({ ...view, active: view.key === active }))}
    />
  );
}
