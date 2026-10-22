import Link from "next/link";

import { TabOverflow } from "@/components/ui/tab-overflow";
import { TabOverflowMenu } from "@/components/ui/tab-overflow-menu";
import {
  tabLinkClassName,
  type RenderTabLink,
  type TabBarOverflow,
  type TabItem,
} from "@/components/ui/tab-styles";

export type { RenderTabLink, TabBarOverflow, TabItem } from "@/components/ui/tab-styles";

export function TabLinkContent({ tab }: { tab: TabItem }) {
  return (
    <>
      {tab.label}
      {typeof tab.count === "number" ? (
        <span className="ml-2 text-xs opacity-80">{tab.count.toLocaleString()}</span>
      ) : null}
    </>
  );
}

/**
 * Link-based segmented tab bar. Server-rendered; the active tab is decided by
 * the caller (route/search-param driven) rather than client state. When the
 * row overflows (narrow screens), the clipped edge fades to hint at more tabs
 * and the active tab is scrolled into view. Secondary tabs can be folded into
 * a "More" menu via `overflow`.
 *
 * `renderLink` lets a client wrapper intercept navigation (e.g. to run it in a
 * transition) while keeping this markup as the single source of tab styling.
 * It is a function prop, so only pass it from client components.
 */
export function TabBar({
  items,
  overflow,
  ariaLabel,
  renderLink,
}: {
  items: TabItem[];
  overflow?: TabBarOverflow;
  ariaLabel?: string;
  renderLink?: RenderTabLink;
}) {
  const showOverflow = overflow && overflow.items.length > 0;
  return (
    <nav
      aria-label={ariaLabel}
      className="border-edge/80 flex w-full max-w-full min-w-0 items-stretch border-b"
    >
      <TabOverflow className="nm-tab-scroller -mb-px min-w-0 flex-1 [scrollbar-width:none] overflow-x-auto pb-px [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        <ul className="flex min-w-max gap-5 sm:gap-7">
          {items.map((tab) => (
            <li key={tab.key}>
              {renderLink ? (
                renderLink(tab, tabLinkClassName(tab.active))
              ) : (
                <Link
                  href={tab.href}
                  aria-current={tab.active ? "page" : undefined}
                  className={tabLinkClassName(tab.active)}
                >
                  <TabLinkContent tab={tab} />
                </Link>
              )}
            </li>
          ))}
        </ul>
      </TabOverflow>
      {showOverflow ? (
        // Outside the scroller so the dropdown is not clipped by overflow-x
        // and the trigger stays visible while primary tabs scroll.
        <div className="-mb-px shrink-0 pl-5 sm:pl-7">
          <TabOverflowMenu label={overflow.label} items={overflow.items} renderLink={renderLink} />
        </div>
      ) : null}
    </nav>
  );
}
