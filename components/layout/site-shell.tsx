import Link from "next/link";
import type { ReactNode } from "react";

import { BrandLogo } from "@/components/branding/brand-logo";
import { SiteNav } from "@/components/layout/site-nav";

export function SiteShell({ children }: { children: ReactNode }) {
  return (
    <>
      <header className="border-b border-zinc-800/90 bg-zinc-950/92 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3 sm:px-5">
          <Link
            href="/"
            aria-label="NostrMash home"
            className="shrink-0 rounded-md border border-transparent px-2 py-1.5 transition hover:border-zinc-800 hover:bg-zinc-900/40 focus-visible:ring-2 focus-visible:ring-indigo-400/70 focus-visible:outline-none"
          >
            <BrandLogo priority />
          </Link>
          <SiteNav />
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-6 pb-28 sm:px-5 sm:py-8 sm:pb-8">
        {children}
      </main>
    </>
  );
}
