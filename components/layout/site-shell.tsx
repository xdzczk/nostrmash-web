import Link from "next/link";
import { headers } from "next/headers";
import type { ReactNode } from "react";

import { BrandLogo } from "@/components/branding/brand-logo";
import { SiteNav } from "@/components/layout/site-nav";
import { ThemeToggle } from "@/components/layout/theme-toggle";

export async function SiteShell({ children }: { children: ReactNode }) {
  const headerStore = await headers();
  const pathname = headerStore.get("x-pathname") ?? "";
  if (pathname.startsWith("/embed")) {
    return <>{children}</>;
  }

  return (
    <>
      <a
        href="#main-content"
        className="nm-pressable border-edge-strong bg-surface text-ink sr-only z-[100] rounded-lg border px-4 py-2 text-sm font-medium focus-visible:not-sr-only focus-visible:fixed focus-visible:top-3 focus-visible:left-4 focus-visible:ring-2 focus-visible:ring-indigo-400/70 focus-visible:outline-none"
      >
        Skip to content
      </a>
      <header className="border-edge/80 bg-surface-sunken/90 supports-[backdrop-filter]:bg-surface-sunken/78 relative border-b shadow-[0_1px_0_rgba(9,9,11,0.9)] backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-6xl items-center gap-4 px-4 py-3 sm:gap-6 sm:px-6 sm:py-3.5">
          <Link
            href="/"
            aria-label="NostrMash home"
            className="nm-pressable border-edge/75 bg-surface/35 hover:border-edge-strong/80 hover:bg-surface/55 focus-visible:ring-accent-soft/70 shrink-0 rounded-lg border px-2.5 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] focus-visible:ring-2 focus-visible:outline-none"
          >
            <BrandLogo className="h-8 w-[138px] sm:w-[174px]" priority />
          </Link>
          <SiteNav />
          <div className="ml-auto sm:ml-0">
            <ThemeToggle />
          </div>
        </div>
        <div
          aria-hidden
          className="via-edge-strong/70 pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent to-transparent"
        />
      </header>
      <main
        id="main-content"
        className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-7 pb-28 sm:px-6 sm:py-9 sm:pb-8"
      >
        {children}
      </main>
    </>
  );
}
