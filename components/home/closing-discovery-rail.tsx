import Link from "next/link";

import { DiscoveryActionLinks } from "@/components/explorer/card-grammar";
import { pickPrimaryDomainSupportingSignal } from "@/components/explorer/domain-supporting-signal";
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
  metric: ReturnType<typeof pickPrimaryDomainSupportingSignal>;
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
        metric: pickPrimaryDomainSupportingSignal(entry),
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
    <section className="border-edge/90 nm-panel-fuchsia flex h-full flex-col rounded-[1.4rem] border p-4 sm:p-5 xl:p-6">
      <header className="space-y-2.5">
        <div className="text-[11px] font-medium tracking-[0.18em] text-fuchsia-300/90 uppercase">
          Hashtags
        </div>
        <h3 className="text-ink-strong text-lg font-semibold tracking-tight">
          Hashtags gaining speed
        </h3>
        <p className="text-ink-muted max-w-lg text-sm leading-6">
          The topics accelerating fastest right now.
        </p>
        <div className="text-ink-muted flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
          <span>{trendWindowLabel}</span>
          <span aria-hidden className="text-zinc-600">
            •
          </span>
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
                              <p className="text-ink-strong truncate text-base font-semibold tracking-tight sm:text-[1.05rem]">
                                #{item.label}
                              </p>
                              {item.metric ? (
                                <span className="text-ink-faint shrink-0 text-xs">
                                  {item.metric.value}
                                </span>
                              ) : null}
                            </div>
                            {rank <= 3 ? (
                              <WhyNow reasons={item.whyNow} maxReasons={1} className="mt-1.5" />
                            ) : null}
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

      <div className="text-ink-faint mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
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
    <section className="border-edge/90 nm-panel-sky flex h-full flex-col rounded-[1.4rem] border p-4 sm:p-5 xl:p-6">
      <header className="space-y-2.5">
        <div className="text-[11px] font-medium tracking-[0.18em] text-sky-300/90 uppercase">
          Domains
        </div>
        <h3 className="text-ink-strong text-lg font-semibold tracking-tight">
          Links gaining traction
        </h3>
        <p className="text-ink-muted max-w-lg text-sm leading-6">
          Domains appearing across the strongest notes.
        </p>
        <div className="text-ink-muted flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
          <span>{trendWindowLabel}</span>
          <span aria-hidden className="text-zinc-600">
            •
          </span>
          <span>{freshnessLabel}</span>
        </div>
      </header>

      <div className="mt-5 min-h-64 flex-1">
        {items.length > 0 ? (
          <div className="grid gap-2.5 xl:grid-cols-2 xl:gap-x-6 xl:gap-y-0">
            {columns.map((column, columnIndex) => {
              const columnOffset = columnIndex * Math.ceil(items.length / columns.length);

              return (
                <ol key={`domains-column-${columnIndex}`} className="divide-edge/80 divide-y">
                  {column.map((item, index) => (
                    <li key={item.rawLabel}>
                      <Link
                        href={item.href}
                        className="group hover:text-ink-strong flex items-start gap-3 py-2.5 transition first:pt-0 last:pb-0"
                      >
                        <span className="border-edge-strong/80 bg-surface-sunken/70 text-ink-dim mt-0.5 flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full border px-1 text-[10px] font-semibold tracking-[0.14em] uppercase">
                          {columnOffset + index + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                            <p className="text-ink min-w-0 flex-1 truncate text-sm font-semibold sm:text-[0.97rem]">
                              <span title={item.rawLabel}>{item.label}</span>
                            </p>
                            {item.metric ? (
                              <span className="inline-flex items-center rounded-full border border-sky-400/20 bg-sky-400/8 px-2 py-0.5 text-[10px] font-medium text-sky-100/90">
                                {item.metric.valueLabel}
                              </span>
                            ) : null}
                          </div>
                          {columnOffset + index + 1 <= 3 ? (
                            <WhyNow reasons={item.whyNow} maxReasons={1} className="mt-1.5" />
                          ) : null}
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

      <div className="text-ink-faint mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
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
    <section className="border-edge/90 nm-panel-close relative overflow-hidden rounded-[1.7rem] border p-5 sm:p-7 xl:p-8 2xl:px-9">
      <header className="max-w-3xl space-y-3">
        <h2 className="text-ink-strong text-[1.5rem] font-semibold tracking-tight sm:text-[1.9rem]">
          Follow what gains speed next
        </h2>
        <p className="text-ink-muted max-w-2xl text-sm leading-6 sm:text-base">
          Track the hashtags and links shaping the current window.
        </p>
        <div className="text-ink-muted flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
          <span>{trendWindowLabel}</span>
          <span className="text-edge-strong">•</span>
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

      <div className="border-edge/80 mt-7 flex flex-col gap-4 border-t pt-5 sm:flex-row sm:items-end sm:justify-between">
        <DiscoveryActionLinks
          actions={[{ label: "Open search", href: "/search?tab=all" }]}
          className="text-ink-faint text-sm"
        />
      </div>
    </section>
  );
}
