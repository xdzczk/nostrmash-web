"use client";

import Link from "next/link";
import { useEffect, useRef, type MouseEvent } from "react";

import {
  tabLinkClassName,
  tabMenuItemClassName,
  type RenderTabLink,
  type TabItem,
} from "@/components/ui/tab-styles";

/**
 * "More ▾" menu for secondary tabs. Built on `<details>` so it works before
 * hydration; once hydrated it closes on item click, Escape, and outside click.
 * When one of the folded tabs is active, the trigger takes that tab's label and
 * active styling so the current location is never hidden.
 */
export function TabOverflowMenu({
  label,
  items,
  renderLink,
}: {
  label: string;
  items: TabItem[];
  renderLink?: RenderTabLink;
}) {
  const ref = useRef<HTMLDetailsElement | null>(null);
  const activeItem = items.find((item) => item.active) ?? null;

  useEffect(() => {
    const details = ref.current;
    if (!details) return;
    const close = () => details.removeAttribute("open");
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && details.open) {
        close();
        details.querySelector("summary")?.focus();
      }
    };
    const onPointerDown = (event: PointerEvent) => {
      if (details.open && event.target instanceof Node && !details.contains(event.target)) close();
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, []);

  const onMenuClick = (event: MouseEvent<HTMLUListElement>) => {
    if (event.target instanceof Element && event.target.closest("a")) {
      ref.current?.removeAttribute("open");
    }
  };

  return (
    <details ref={ref} className="group relative" data-testid="tab-overflow-menu">
      <summary
        aria-haspopup="menu"
        aria-current={activeItem ? "page" : undefined}
        className={`${tabLinkClassName(Boolean(activeItem))} cursor-pointer list-none select-none marker:content-none [&::-webkit-details-marker]:hidden`}
      >
        {activeItem ? activeItem.label : label}
        <span aria-hidden className="ml-1.5 text-[10px] transition group-open:rotate-180">
          ▾
        </span>
      </summary>
      <ul
        role="menu"
        aria-label={label}
        onClick={onMenuClick}
        className="border-edge bg-surface-elevated absolute top-full right-0 z-30 mt-1 min-w-48 rounded-lg border p-1 shadow-xl"
      >
        {items.map((tab) => (
          <li key={tab.key} role="none">
            {renderLink ? (
              renderLink(tab, tabMenuItemClassName(tab.active), { role: "menuitem" })
            ) : (
              <Link
                role="menuitem"
                href={tab.href}
                aria-current={tab.active ? "page" : undefined}
                className={tabMenuItemClassName(tab.active)}
              >
                {tab.label}
                {typeof tab.count === "number" ? (
                  <span className="text-ink-faint text-xs tabular-nums">
                    {tab.count.toLocaleString()}
                  </span>
                ) : null}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </details>
  );
}
