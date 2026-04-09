import Link from "next/link";
import type { ReactNode } from "react";

import { BrandLogo } from "@/components/branding/brand-logo";
import { SiteNav } from "@/components/layout/site-nav";

export function SiteShell({ children }: { children: ReactNode }) {
  return (
    <>
      <header className="border-b border-zinc-800/90 bg-zinc-950/92 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-6 px-5 py-3">
          <Link
            href="/"
            aria-label="NostrMash home"
            className="rounded-md border border-transparent px-1.5 py-1 transition hover:border-zinc-800 hover:bg-zinc-900/40 focus-visible:ring-2 focus-visible:ring-indigo-400/70 focus-visible:outline-none"
          >
            <BrandLogo priority />
          </Link>
          <SiteNav />
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-5 py-8">{children}</main>
    </>
  );
}
