import Link from "next/link";
import type { ReactNode } from "react";

import { BrandLogo } from "@/components/branding/brand-logo";
import { SiteNav } from "@/components/layout/site-nav";

export function SiteShell({ children }: { children: ReactNode }) {
  return (
    <>
      <header className="relative border-b border-zinc-800/80 bg-zinc-950/90 shadow-[0_1px_0_rgba(9,9,11,0.9)] backdrop-blur-md supports-[backdrop-filter]:bg-zinc-950/78">
        <div className="mx-auto flex w-full max-w-6xl items-center gap-4 px-4 py-3 sm:gap-6 sm:px-6 sm:py-3.5">
          <Link
            href="/"
            aria-label="NostrMash home"
            className="shrink-0 rounded-lg border border-zinc-800/75 bg-zinc-900/35 px-2.5 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition hover:border-zinc-700/80 hover:bg-zinc-900/55 focus-visible:ring-2 focus-visible:ring-indigo-400/70 focus-visible:outline-none"
          >
            <BrandLogo className="h-8 w-[138px] sm:w-[174px]" priority />
          </Link>
          <SiteNav />
        </div>
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-zinc-700/70 to-transparent"
        />
      </header>
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-7 pb-28 sm:px-6 sm:py-9 sm:pb-8">
        {children}
      </main>
    </>
  );
}
