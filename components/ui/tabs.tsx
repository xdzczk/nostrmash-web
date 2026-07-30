import Link from "next/link";

export type TabItem = {
  key: string;
  label: string;
  href: string;
  active: boolean;
  count?: number;
};

/**
 * Link-based segmented tab bar. Server-rendered; the active tab is decided by
 * the caller (route/search-param driven) rather than client state.
 */
export function TabBar({ items, ariaLabel }: { items: TabItem[]; ariaLabel?: string }) {
  return (
    <nav
      aria-label={ariaLabel}
      className="border-edge/80 overflow-x-auto border-b [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      <ul className="flex min-w-max gap-7">
        {items.map((tab) => (
          <li key={tab.key}>
            <Link
              href={tab.href}
              aria-current={tab.active ? "page" : undefined}
              className={`nm-pressable focus-visible:ring-accent-soft/70 relative inline-flex min-h-11 items-center rounded-sm py-2 text-[13px] font-medium focus-visible:ring-2 focus-visible:outline-none ${
                tab.active
                  ? "after:bg-accent-soft text-ink after:absolute after:right-0 after:bottom-[-1px] after:left-0 after:h-0.5 after:rounded-full"
                  : "text-ink-muted hover:text-ink"
              }`}
            >
              {tab.label}
              {typeof tab.count === "number" ? (
                <span className="ml-2 text-xs opacity-80">{tab.count.toLocaleString()}</span>
              ) : null}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
