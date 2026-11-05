import { TabBar } from "@/components/ui/tabs";
import { DISCOVER_VIEWS, type DiscoverView } from "@/lib/discover/views";
import { buildDiscoverHref } from "@/lib/search-params/language";
import type { StatsWindow } from "@/lib/search-params/window";

export function DiscoverNav({
  active,
  window,
  lang,
  excludeBridged,
}: {
  active: DiscoverView;
  window?: StatsWindow;
  lang?: string;
  excludeBridged?: boolean;
}) {
  return (
    <TabBar
      ariaLabel="Discover categories"
      prefetch
      items={DISCOVER_VIEWS.map((view) => ({
        ...view,
        href: buildDiscoverHref(view.href, { window, lang, excludeBridged }),
        active: view.key === active,
      }))}
    />
  );
}
