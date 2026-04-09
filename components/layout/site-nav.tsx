"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/", label: "Home" },
  { href: "/search", label: "Search" },
  { href: "/trending", label: "Trending" },
  { href: "/stats", label: "Stats" },
  { href: "/methodology", label: "Methodology" },
];

function isActivePath(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SiteNav() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-1.5 text-sm text-zinc-300">
      {navItems.map((item) => {
        const active = isActivePath(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`rounded-md border px-3 py-1.5 text-[13px] font-medium tracking-[0.01em] transition focus-visible:ring-2 focus-visible:ring-indigo-400/70 focus-visible:outline-none ${
              active
                ? "border-zinc-700 bg-zinc-900/90 text-zinc-100"
                : "border-transparent text-zinc-400 hover:border-zinc-800 hover:bg-zinc-900/55 hover:text-zinc-100"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
