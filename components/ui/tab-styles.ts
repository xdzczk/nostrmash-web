import type { ReactNode } from "react";

export type TabItem = {
  key: string;
  label: string;
  href: string;
  active: boolean;
  count?: number;
  /** Shown instead of `count` when the number is a page length, e.g. "20+". */
  countLabel?: string;
};

export type TabBarOverflow = {
  /** Trigger label when none of the folded tabs is active, e.g. "More". */
  label: string;
  items: TabItem[];
};

export type RenderTabLinkOptions = {
  /** ARIA role for the anchor when rendered inside the overflow menu. */
  role?: "menuitem";
};

export type RenderTabLink = (
  tab: TabItem,
  className: string,
  options?: RenderTabLinkOptions
) => ReactNode;

/** Shared tab link styling so server and client renderers stay identical. */
export function tabLinkClassName(active: boolean): string {
  return `nm-pressable focus-visible:ring-accent-soft/70 relative inline-flex min-h-11 items-center rounded-sm py-2 text-[13px] font-medium focus-visible:ring-2 focus-visible:outline-none ${
    active
      ? "after:bg-accent-soft text-ink after:absolute after:right-0 after:bottom-[-1px] after:left-0 after:h-0.5 after:rounded-full"
      : "text-ink-muted hover:text-ink"
  }`;
}

export function tabMenuItemClassName(active: boolean): string {
  return `nm-pressable focus-visible:ring-accent-soft/70 flex min-h-10 w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-[13px] focus-visible:ring-2 focus-visible:outline-none ${
    active ? "bg-surface-hover text-ink font-medium" : "text-ink-soft hover:bg-surface-hover"
  }`;
}
