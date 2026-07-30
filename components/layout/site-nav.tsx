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
    <nav aria-label="Primary" className="text-ink-muted flex shrink-0 items-center gap-5 text-sm">
      {navItems.map((item) => {
        const active = isActivePath(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`nm-pressable focus-visible:ring-accent-soft/70 relative inline-flex min-h-11 items-center rounded-md px-1 text-[13px] font-medium tracking-[0.005em] focus-visible:ring-2 focus-visible:outline-none ${
              active
                ? "text-ink after:bg-accent-soft after:absolute after:right-0 after:bottom-1 after:left-0 after:h-0.5 after:rounded-full"
                : "text-ink-muted hover:text-ink"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
