import Link from "next/link";

import { DiscoveryActionLinks } from "@/components/explorer/card-grammar";
import { EmptyState } from "@/components/explorer/empty-state";
import { normalizeDomainLabel, truncateIdentifier } from "@/components/explorer/utils";
import {
  mapDomainWhyNow,
  mapHashtagWhyNow,
  WhyNow,
  type WhyNowReason,
} from "@/components/explorer/why-now";
import type { DomainEntry, HashtagEntry } from "@/lib/types/api";

type DiscoveryMetric = {
  label: string;
  value: string;
};

type NormalizedHashtag = {
  label: string;
  href: string;
  metric: DiscoveryMetric | null;
  whyNow: WhyNowReason[];
};

type NormalizedDomain = {
  rawLabel: string;
  label: string;
  href: string;
  metric: DiscoveryMetric | null;
  whyNow: WhyNowReason[];
};

function splitIntoColumns<T>(items: T[], columnCount: number): T[][] {
  if (items.length === 0 || columnCount <= 1) return [items];
  const size = Math.ceil(items.length / columnCount);
  return Array.from({ length: columnCount }, (_, index) =>
    items.slice(index * size, index * size + size)
  ).filter((column) => column.length > 0);
}

function formatCount(value: number, singular: string, plural: string): string {
  return `${value.toLocaleString()} ${value === 1 ? singular : plural}`;
}

function buildHashtagMetric(entry: HashtagEntry): DiscoveryMetric | null {
  if (typeof entry.count === "number") {
    return {
      label: "Mentions",
      value: formatCount(entry.count, "mention", "mentions"),
    };
  }

  if (typeof entry.event_count === "number") {
    return {
      label: "Notes",
      value: formatCount(entry.event_count, "note", "notes"),
    };
  }

  if (typeof entry.unique_authors === "number") {
    return {
      label: "Authors",
      value: formatCount(entry.unique_authors, "author", "authors"),
    };
  }

  return null;
}

function buildDomainMetric(entry: DomainEntry): DiscoveryMetric | null {
  if (typeof entry.unique_authors === "number") {
    return {
      label: "Authors",
      value: formatCount(entry.unique_authors, "author", "authors"),
    };
  }

  if (typeof entry.count === "number") {
    return {
      label: "Linked notes",
      value: formatCount(entry.count, "note", "notes"),
    };
  }

  if (typeof entry.event_count === "number") {
    return {
      label: "Linked notes",
      value: formatCount(entry.event_count, "note", "notes"),
    };
  }

  return null;
}

function normalizeHashtags(hashtags: HashtagEntry[]): NormalizedHashtag[] {
  return hashtags
    .map((entry) => {
      const hashtag =
        typeof entry.hashtag === "string" ? entry.hashtag.trim().replace(/^#/, "") : "";
      if (!hashtag) return null;

      return {
        label: hashtag,
        href: `/hashtags/${encodeURIComponent(hashtag)}`,
        metric: buildHashtagMetric(entry),
        whyNow: mapHashtagWhyNow(entry),
      };
    })
    .filter((entry): entry is NormalizedHashtag => entry !== null);
}

function normalizeDomains(domains: DomainEntry[]): NormalizedDomain[] {
  return domains
    .map((entry) => {
      const domain =
        typeof entry.domain === "string"
          ? entry.domain
              .trim()
              .toLowerCase()
              .replace(/^www\./, "")
          : "";
      if (!domain) return null;

      return {
        rawLabel: domain,
        label: truncateIdentifier(normalizeDomainLabel(domain), "domain", "primary"),
        href: `/domains/${encodeURIComponent(domain)}`,
        metric: buildDomainMetric(entry),
        whyNow: mapDomainWhyNow(entry),
      };
    })
    .filter((entry): entry is NormalizedDomain => entry !== null);
}

function HashtagDiscoveryModule({
  hashtags,
  trendWindowLabel,
  freshnessLabel,
}: {
  hashtags: HashtagEntry[];
  trendWindowLabel: string;
  freshnessLabel: string;
}) {
  const items = normalizeHashtags(hashtags);
  const columns = splitIntoColumns(items, 2);

  return (
    <section className="flex h-full flex-col rounded-[1.4rem] border border-zinc-800/90 bg-[radial-gradient(circle_at_top_left,rgba(217,70,239,0.08),transparent_42%),linear-gradient(180deg,rgba(24,24,27,0.92),rgba(20,20,23,0.88))] p-4 shadow-[0_18px_60px_rgba(0,0,0,0.12)] sm:p-5 xl:p-6">
      <header className="space-y-2.5">
        <div className="inline-flex items-center rounded-full border border-fuchsia-400/15 bg-fuchsia-400/8 px-2.5 py-1 text-[11px] font-medium tracking-[0.18em] text-fuchsia-200 uppercase">
          Hashtags
        </div>
        <h3 className="text-lg font-semibold tracking-tight text-zinc-50">
          Hashtags gaining speed
        </h3>
        <p className="max-w-lg text-sm leading-6 text-zinc-400">
          The topics accelerating fastest right now.
        </p>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-zinc-400">
          <span>{trendWindowLabel}</span>
          <span className="text-zinc-600">•</span>
          <span>{freshnessLabel}</span>
        </div>
      </header>

      <div className="mt-5 min-h-64 flex-1">
        {items.length > 0 ? (
          <div className="grid gap-2.5 xl:grid-cols-2 xl:gap-x-6 xl:gap-y-0">
            {columns.map((column, columnIndex) => {
              const columnOffset = columnIndex * Math.ceil(items.length / columns.length);

              return (
                <ol key={`hashtags-column-${columnIndex}`} className="space-y-1.5">
                  {column.map((item, index) => {
                    const rank = columnOffset + index + 1;

                    return (
                      <li key={item.label} className="border-b border-white/6 last:border-b-0">
                        <Link
                          href={item.href}
                          className="flex items-baseline gap-4 rounded-2xl px-1 py-3 transition hover:bg-white/[0.03]"
                        >
                          <span className="w-9 shrink-0 text-right text-[11px] font-medium tracking-[0.2em] text-fuchsia-300/80 uppercase">
                            {String(rank).padStart(2, "0")}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-baseline justify-between gap-3">
                              <p className="truncate text-base font-semibold tracking-tight text-zinc-50 sm:text-[1.05rem]">
                                #{item.label}
                              </p>
                              {item.metric ? (
                                <span className="shrink-0 text-xs text-zinc-500">
                                  {item.metric.value}
                                </span>
                              ) : null}
                            </div>
                            <WhyNow reasons={item.whyNow} className="mt-1.5" />
                          </div>
                        </Link>
                      </li>
                    );
                  })}
                </ol>
              );
            })}
          </div>
        ) : (
          <div className="flex h-full items-center">
            <EmptyState
              title="Hashtag ranking is quiet"
              message="No clear hashtag movement was returned for this window."
            />
          </div>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-zinc-500">
        <Link href="/trending/hashtags" className="hover:text-fuchsia-200">
          See all hashtags
        </Link>
      </div>
    </section>
  );
}

function DomainDiscoveryModule({
  domains,
  trendWindowLabel,
  freshnessLabel,
}: {
  domains: DomainEntry[];
  trendWindowLabel: string;
  freshnessLabel: string;
}) {
  const items = normalizeDomains(domains);
  const columns = splitIntoColumns(items, 2);

  return (
    <section className="flex h-full flex-col rounded-[1.4rem] border border-zinc-800/90 bg-[radial-gradient(circle_at_top_right,rgba(14,165,233,0.08),transparent_40%),linear-gradient(180deg,rgba(24,24,27,0.92),rgba(20,20,23,0.88))] p-4 shadow-[0_18px_60px_rgba(0,0,0,0.12)] sm:p-5 xl:p-6">
      <header className="space-y-2.5">
        <div className="inline-flex items-center rounded-full border border-sky-400/15 bg-sky-400/8 px-2.5 py-1 text-[11px] font-medium tracking-[0.18em] text-sky-200 uppercase">
          Domains
        </div>
        <h3 className="text-lg font-semibold tracking-tight text-zinc-50">
          Links gaining traction
        </h3>
        <p className="max-w-lg text-sm leading-6 text-zinc-400">
          Domains appearing across the strongest notes.
        </p>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-zinc-400">
          <span>{trendWindowLabel}</span>
          <span className="text-zinc-600">•</span>
          <span>{freshnessLabel}</span>
        </div>
      </header>

      <div className="mt-5 min-h-64 flex-1">
        {items.length > 0 ? (
          <div className="grid gap-2.5 xl:grid-cols-2 xl:gap-x-6 xl:gap-y-0">
            {columns.map((column, columnIndex) => {
              const columnOffset = columnIndex * Math.ceil(items.length / columns.length);

              return (
                <ol key={`domains-column-${columnIndex}`} className="divide-y divide-zinc-800/80">
                  {column.map((item, index) => (
                    <li key={item.rawLabel}>
                      <Link
                        href={item.href}
                        className="group flex items-center gap-3 py-3 transition first:pt-0 last:pb-0 hover:text-white"
                      >
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-zinc-700/80 bg-zinc-950/70 text-[11px] font-medium text-zinc-300">
                          {columnOffset + index + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-3">
                            <p className="truncate text-sm font-semibold text-zinc-100 sm:text-[0.97rem]">
                              <span title={item.rawLabel}>{item.label}</span>
                            </p>
                            {item.metric ? (
                              <span className="shrink-0 text-xs text-zinc-500">
                                {item.metric.value}
                              </span>
                            ) : null}
                          </div>
                          <WhyNow reasons={item.whyNow} className="mt-1.5" />
                        </div>
                      </Link>
                    </li>
                  ))}
                </ol>
              );
            })}
          </div>
        ) : (
          <div className="flex h-full items-center">
            <EmptyState
              title="Domain ranking is quiet"
              message="No clear link movement was returned for this window."
            />
          </div>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-zinc-500">
        <Link href="/trending/domains" className="hover:text-sky-200">
          See all domains
        </Link>
      </div>
    </section>
  );
}

export function ClosingDiscoveryRail({
  hashtags,
  domains,
  trendWindowLabel,
  hashtagsFreshness,
  domainsFreshness,
}: {
  hashtags: HashtagEntry[];
  domains: DomainEntry[];
  trendWindowLabel: string;
  hashtagsFreshness: string;
  domainsFreshness: string;
}) {
  return (
    <section className="relative overflow-hidden rounded-[1.7rem] border border-zinc-800/90 bg-[radial-gradient(circle_at_bottom_center,rgba(99,102,241,0.08),transparent_40%),linear-gradient(180deg,rgba(24,24,27,0.92),rgba(15,15,17,0.98))] p-5 shadow-[0_24px_90px_rgba(0,0,0,0.22)] sm:p-7 xl:p-8 2xl:px-9">
      <header className="max-w-3xl space-y-3">
        <h2 className="text-[1.5rem] font-semibold tracking-tight text-zinc-50 sm:text-[1.9rem]">
          Follow what gains speed next
        </h2>
        <p className="max-w-2xl text-sm leading-6 text-zinc-400 sm:text-base">
          Track the hashtags and links shaping the current window.
        </p>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-zinc-400">
          <span>{trendWindowLabel}</span>
          <span className="text-zinc-700">•</span>
          <span>Topics and links</span>
        </div>
      </header>

      <div className="mt-7 grid gap-4 xl:grid-cols-[minmax(0,1.12fr)_minmax(0,0.88fr)] xl:gap-5 2xl:grid-cols-[minmax(0,1.18fr)_minmax(0,0.82fr)]">
        <HashtagDiscoveryModule
          hashtags={hashtags}
          trendWindowLabel={trendWindowLabel}
          freshnessLabel={hashtagsFreshness}
        />
        <DomainDiscoveryModule
          domains={domains}
          trendWindowLabel={trendWindowLabel}
          freshnessLabel={domainsFreshness}
        />
      </div>

      <div className="mt-7 flex flex-col gap-4 border-t border-zinc-800/80 pt-5 sm:flex-row sm:items-end sm:justify-between">
        <DiscoveryActionLinks
          actions={[{ label: "Open search", href: "/search?tab=all" }]}
          className="text-sm text-zinc-500"
        />
      </div>
    </section>
  );
}
