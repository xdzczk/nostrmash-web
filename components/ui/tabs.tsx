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
    <nav aria-label={ariaLabel} className="border-edge bg-surface/45 rounded-xl border p-1">
      <ul className="flex flex-wrap gap-1">
        {items.map((tab) => (
          <li key={tab.key}>
            <Link
              href={tab.href}
              aria-current={tab.active ? "page" : undefined}
              className={`nm-pressable focus-visible:ring-accent-soft/70 inline-flex items-center rounded-lg px-3 py-1.5 text-sm focus-visible:ring-2 focus-visible:outline-none ${
                tab.active
                  ? "bg-ink text-surface"
                  : "hover:bg-surface/80 text-ink-dim hover:text-ink"
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
