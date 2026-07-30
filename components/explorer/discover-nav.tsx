import { TabBar } from "@/components/ui/tabs";
import { DISCOVER_VIEWS, type DiscoverView } from "@/lib/discover/views";
import type { StatsWindow } from "@/lib/search-params/window";

export function DiscoverNav({ active, window }: { active: DiscoverView; window?: StatsWindow }) {
  return (
    <TabBar
      ariaLabel="Discover categories"
      items={DISCOVER_VIEWS.map((view) => ({
        ...view,
        href: window ? `${view.href}?window=${window}` : view.href,
        active: view.key === active,
      }))}
    />
  );
}
