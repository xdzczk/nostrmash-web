import Link from "next/link";
import type { ReactNode } from "react";

const navItems = [
  { href: "/", label: "Home" },
  { href: "/search", label: "Search" },
  { href: "/trending", label: "Trending" },
  { href: "/stats", label: "Stats" },
  { href: "/methodology", label: "Methodology" },
];

export function SiteShell({ children }: { children: ReactNode }) {
  return (
    <>
      <header className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-4">
          <Link href="/" className="text-sm font-semibold tracking-wide text-zinc-100">
            NOSTRMASH
          </Link>
          <nav className="flex items-center gap-4 text-sm text-zinc-300">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href} className="hover:text-white">
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-5 py-6">{children}</main>
    </>
  );
}
