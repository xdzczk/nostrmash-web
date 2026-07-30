"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/", label: "Discover" },
  { href: "/relays", label: "Network" },
];

function isActivePath(pathname: string, href: string): boolean {
  if (href === "/relays") return pathname.startsWith("/relays") || pathname.startsWith("/stats");
  return !pathname.startsWith("/relays") && !pathname.startsWith("/stats");
}

export function SiteNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Primary" className="text-ink-muted flex shrink-0 items-center gap-1 text-sm">
      {navItems.map((item) => {
        const active = isActivePath(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`nm-pressable focus-visible:ring-accent-soft/70 relative inline-flex min-h-11 items-center rounded-lg px-3 text-[13px] font-medium tracking-[0.01em] focus-visible:ring-2 focus-visible:outline-none sm:px-3.5 ${
              active ? "bg-surface text-ink" : "text-ink-muted hover:bg-surface/55 hover:text-ink"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
