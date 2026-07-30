import Link from "next/link";
import { headers } from "next/headers";
import type { ReactNode } from "react";

import { BrandLogo } from "@/components/branding/brand-logo";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteNav } from "@/components/layout/site-nav";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { GlobalSearch } from "@/components/search/global-search";

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
        className="nm-pressable border-edge-strong bg-surface text-ink focus-visible:ring-accent-soft/70 sr-only z-[100] rounded-lg border px-4 py-2 text-sm font-medium focus-visible:not-sr-only focus-visible:fixed focus-visible:top-3 focus-visible:left-4 focus-visible:ring-2 focus-visible:outline-none"
      >
        Skip to content
      </a>
      <header className="border-edge/80 bg-background/94 supports-[backdrop-filter]:bg-background/88 sticky top-0 z-50 border-b backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-[82rem] flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2 sm:px-6 lg:flex-nowrap lg:gap-6 lg:px-8">
          <Link
            href="/"
            aria-label="NostrMash home"
            className="nm-pressable focus-visible:ring-accent-soft/70 shrink-0 rounded-lg px-1 py-1.5 focus-visible:ring-2 focus-visible:outline-none"
          >
            <BrandLogo className="h-7 w-[122px] sm:w-[144px]" priority />
          </Link>
          <div className="border-edge/60 order-3 w-full border-t pt-1 lg:order-none lg:w-auto lg:border-0 lg:pt-0">
            <SiteNav />
          </div>
          <div className="ml-auto flex min-w-0 items-center gap-2 lg:w-full lg:max-w-[34rem]">
            <GlobalSearch />
            <ThemeToggle />
          </div>
        </div>
      </header>
      <main
        id="main-content"
        className="mx-auto flex w-full max-w-[82rem] flex-1 scroll-mt-24 flex-col px-4 py-7 sm:px-6 sm:py-9 lg:px-8 lg:py-11"
      >
        {children}
      </main>
      <SiteFooter />
    </>
  );
}
