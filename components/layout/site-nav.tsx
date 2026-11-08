"use client";

import Link from "@/components/app-link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/", label: "Discover" },
  { href: "/relays", label: "Relays" },
  { href: "/stats", label: "Stats" },
  { href: "/me", label: "Your view" },
];

function isActivePath(pathname: string, href: string): boolean {
  if (href === "/me") return pathname === "/me";
  if (href === "/relays") return pathname.startsWith("/relays");
  if (href === "/stats") return pathname.startsWith("/stats");
  if (pathname === "/me" || pathname.startsWith("/about") || pathname.startsWith("/developers")) {
    return false;
  }
  return !pathname.startsWith("/relays") && !pathname.startsWith("/stats");
}

export function SiteNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary"
      className="text-ink-muted flex shrink-0 items-center gap-3 text-sm sm:gap-5"
    >
      {navItems.map((item) => {
        const active = isActivePath(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            // These routes read request headers and ship a loading skeleton,
            // so the default prefetch never includes the page. The other
            // section is fetched in full before the click.
            prefetch={!active}
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
