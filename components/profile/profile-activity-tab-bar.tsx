"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition, type MouseEvent, type ReactNode } from "react";

import { NotesListSkeleton } from "@/components/ui/skeleton";
import { TabBar, TabLinkContent } from "@/components/ui/tabs";
import type { TabBarOverflow, TabItem } from "@/components/ui/tab-styles";

function isPlainLeftClick(event: MouseEvent<HTMLAnchorElement>): boolean {
  return (
    !event.defaultPrevented &&
    event.button === 0 &&
    !event.metaKey &&
    !event.ctrlKey &&
    !event.shiftKey &&
    !event.altKey
  );
}

/**
 * Tab bar for the profile activity section. Tabs stay URL-driven (server
 * renders the selected list), but switching runs inside a React transition:
 * the clicked tab highlights immediately, the panel shows a skeleton while
 * the server payload streams in, and the page does not scroll. Modifier and
 * middle clicks fall through to the browser so "open in new tab" still works.
 */
export function ProfileActivityTabBar({
  items,
  overflow,
  activeKey,
  ariaLabel,
  children,
}: {
  items: TabItem[];
  overflow?: TabBarOverflow;
  /** Server-decided active tab key. */
  activeKey: string;
  ariaLabel?: string;
  /** The server-rendered panel for `activeKey`. */
  children: ReactNode;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [optimisticKey, setOptimisticKey] = useState<string | null>(null);

  // While a transition is in flight the clicked tab is shown as active; once
  // the server payload lands, isPending drops and the real key takes over.
  const effectiveActive = isPending && optimisticKey ? optimisticKey : activeKey;
  const decorate = (tabs: TabItem[]) =>
    tabs.map((tab) => ({ ...tab, active: tab.key === effectiveActive }));

  const select = (tab: TabItem) => (event: MouseEvent<HTMLAnchorElement>) => {
    if (!isPlainLeftClick(event)) return;
    if (tab.key === effectiveActive) {
      event.preventDefault();
      return;
    }
    event.preventDefault();
    setOptimisticKey(tab.key);
    startTransition(() => {
      router.replace(tab.href, { scroll: false });
    });
  };

  return (
    <>
      <div className="bg-background sticky top-16 z-30">
        <TabBar
          ariaLabel={ariaLabel}
          items={decorate(items)}
          overflow={overflow ? { ...overflow, items: decorate(overflow.items) } : undefined}
          renderLink={(tab, className, options) => (
            <Link
              href={tab.href}
              onClick={select(tab)}
              role={options?.role}
              aria-current={tab.active ? "page" : undefined}
              className={className}
            >
              <TabLinkContent tab={tab} />
            </Link>
          )}
        />
      </div>
      <div
        aria-busy={isPending || undefined}
        aria-live="polite"
        data-testid="profile-activity-panel"
        data-pending={isPending ? "true" : undefined}
      >
        {isPending ? <NotesListSkeleton count={3} /> : children}
      </div>
    </>
  );
}
