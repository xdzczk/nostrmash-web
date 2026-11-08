import type { ReactNode } from "react";

import Link from "@/components/app-link";

import { NetworkNav } from "@/components/explorer/network-nav";
import { PageHero } from "@/components/explorer/page-hero";
import { WindowSelector } from "@/components/explorer/window-selector";
import { STATS_WINDOWS, type StatsWindow } from "@/lib/search-params/window";

export const STATS_SECTIONS = [
  { href: "/stats", label: "Overview" },
  { href: "/stats/activity", label: "Activity" },
  { href: "/stats/zaps", label: "Zaps" },
  { href: "/stats/people", label: "People" },
  { href: "/stats/moderation", label: "Moderation" },
  { href: "/stats/relays", label: "Relays" },
  { href: "/stats/communities", label: "Communities" },
] as const;

export function statsHref(path: string, searchParams: URLSearchParams): string {
  const next = new URLSearchParams();
  const window = searchParams.get("window");
  if (window && window !== "24h") next.set("window", window);
  const query = next.toString();
  return query.length > 0 ? `${path}?${query}` : path;
}

export function StatsFrame({
  path,
  title,
  subtitle,
  headline,
  toc,
  searchParams,
  window,
  children,
}: {
  path: string;
  title: string;
  subtitle: string;
  headline?: string;
  toc: Array<{ id: string; label: string }>;
  searchParams: URLSearchParams;
  window: StatsWindow;
  children: ReactNode;
}) {
  return (
    <div className="space-y-8">
      <PageHero
        eyebrow="Statistics"
        title={title}
        subtitle={subtitle}
        badges={
          <WindowSelector
            path={path}
            searchParams={searchParams}
            activeWindow={window}
            windows={STATS_WINDOWS}
          />
        }
      />
      <NetworkNav active="stats" />
      {path !== "/stats" ? (
        <nav
          aria-label="Statistics sections"
          className="flex flex-wrap items-center gap-x-4 gap-y-1"
        >
          {STATS_SECTIONS.map((section) => {
            const active = section.href === path;
            return (
              <Link
                key={section.href}
                href={statsHref(section.href, searchParams)}
                aria-current={active ? "page" : undefined}
                className={`text-sm ${
                  active
                    ? "text-ink underline decoration-[var(--accent-soft)] decoration-2 underline-offset-4"
                    : "text-ink-muted hover:text-ink"
                }`}
              >
                {section.label}
              </Link>
            );
          })}
        </nav>
      ) : null}
      {headline ? (
        <p className="text-ink-strong max-w-[46rem] text-lg leading-7 tracking-[-0.02em]">
          {headline}
        </p>
      ) : null}
      <div className="xl:grid xl:grid-cols-[minmax(0,1fr)_12rem] xl:items-start xl:gap-10">
        <div className="min-w-0 space-y-8">{children}</div>
        {toc.length > 0 ? (
          <nav aria-label="On this page" className="hidden xl:sticky xl:top-24 xl:block">
            <p className="text-ink-faint mb-2 text-[11px] font-medium tracking-wide uppercase">
              On this page
            </p>
            <ul className="xl:block">
              {toc.map((item) => (
                <li key={item.id} className="shrink-0">
                  <a href={`#${item.id}`} className="text-ink-muted hover:text-ink text-sm">
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        ) : null}
      </div>
    </div>
  );
}
