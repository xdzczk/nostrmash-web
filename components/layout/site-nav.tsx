"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/", label: "Home", mobileLabel: "Home" },
  { href: "/search", label: "Search", mobileLabel: "Search" },
  { href: "/trending", label: "Trends", mobileLabel: "Trends" },
  { href: "/relays", label: "Relays", mobileLabel: "Relays" },
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
      <nav className="hidden items-center gap-1 rounded-lg border border-zinc-800/75 bg-zinc-950/70 p-1 text-sm text-zinc-300 sm:ml-auto sm:flex sm:w-auto sm:justify-end">
        {navItems.map((item) => {
          const active = isActivePath(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`relative min-h-11 rounded-md border px-3.5 py-2 text-[13px] font-medium tracking-[0.01em] transition focus-visible:ring-2 focus-visible:ring-indigo-400/70 focus-visible:outline-none ${
                active
                  ? "border-zinc-700/80 bg-zinc-900/90 text-zinc-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] after:absolute after:right-2 after:bottom-1.5 after:left-2 after:h-px after:rounded-full after:bg-indigo-300/70"
                  : "border-transparent text-zinc-400 hover:border-zinc-800 hover:bg-zinc-900/55 hover:text-zinc-100"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <nav
        aria-label="Mobile"
        className="fixed inset-x-0 bottom-0 z-50 border-t border-zinc-800/90 bg-zinc-950/95 backdrop-blur-md sm:hidden"
      >
        <div className="mx-auto flex max-w-md items-stretch gap-1 px-3 pt-2 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]">
          {navItems.map((item) => {
            const active = isActivePath(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-12 min-w-0 flex-1 items-center justify-center rounded-xl border border-transparent px-2 py-2 text-[11px] font-medium transition focus-visible:ring-2 focus-visible:ring-indigo-400/70 focus-visible:outline-none ${
                  active
                    ? "border-zinc-700/80 bg-zinc-900/95 text-zinc-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
                    : "text-zinc-300 hover:bg-zinc-900 hover:text-zinc-100"
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
