"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/", label: "Home", mobileLabel: "Home" },
  { href: "/search", label: "Search", mobileLabel: "Search" },
  { href: "/trending", label: "Trends", mobileLabel: "Trends" },
  { href: "/relays", label: "Relays", mobileLabel: "Relays" },
  { href: "/stats", label: "Stats", mobileLabel: "Stats" },
  { href: "/methodology", label: "Methodology", mobileLabel: "Guide" },
];

function isActivePath(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SiteNav() {
  const pathname = usePathname();

  return (
    <>
      <nav className="border-edge/75 bg-surface-sunken/70 text-ink-dim hidden items-center gap-1 rounded-lg border p-1 text-sm sm:ml-auto sm:flex sm:w-auto sm:justify-end">
        {navItems.map((item) => {
          const active = isActivePath(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`nm-pressable focus-visible:ring-accent-soft/70 relative min-h-11 rounded-md border px-3.5 py-2 text-[13px] font-medium tracking-[0.01em] focus-visible:ring-2 focus-visible:outline-none ${
                active
                  ? "border-edge-strong/80 bg-surface/90 after:bg-link/70 text-ink shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] after:absolute after:right-2 after:bottom-1.5 after:left-2 after:h-px after:rounded-full"
                  : "text-ink-muted hover:border-edge hover:bg-surface/55 hover:text-ink border-transparent"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <nav
        aria-label="Mobile"
        className="border-edge/90 bg-surface-sunken/95 fixed inset-x-0 bottom-0 z-50 border-t backdrop-blur-md sm:hidden"
      >
        <div className="mx-auto flex max-w-md items-stretch gap-1 px-3 pt-2 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]">
          {navItems.map((item) => {
            const active = isActivePath(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`nm-pressable focus-visible:ring-accent-soft/70 flex min-h-12 min-w-0 flex-1 items-center justify-center rounded-xl border border-transparent px-2 py-2 text-[11px] font-medium focus-visible:ring-2 focus-visible:outline-none ${
                  active
                    ? "border-edge-strong/80 bg-surface/95 text-ink shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
                    : "hover:bg-surface text-ink-dim hover:text-ink"
                }`}
              >
                <span className="truncate">{item.mobileLabel}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
