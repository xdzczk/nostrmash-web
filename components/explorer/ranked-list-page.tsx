import Link from "next/link";
import type { ReactNode } from "react";

import { DebugDisclosure } from "@/components/explorer/debug-disclosure";
import { EmptyState } from "@/components/explorer/empty-state";
import { AboutThisData } from "@/components/explorer/about-this-data";
import { PageHero } from "@/components/explorer/page-hero";
import { WindowSelector } from "@/components/explorer/window-selector";
import { JsonLd } from "@/components/seo/json-ld";
import { SectionCard } from "@/components/ui/section-card";
import { ErrorPanel, SoftRefreshNote } from "@/components/ui/status-panels";
import { absoluteUrl } from "@/lib/seo/metadata";
import { formatStatsWindowLabel, type StatsWindow } from "@/lib/search-params/window";
import type { NativeApiSemantics } from "@/lib/types/api";

export function RankedListPage({
  eyebrow,
  title,
  subtitle,
  path,
  searchParams,
  window,
  semantics,
  heroExtraBadges,
  sectionTitle,
  sectionDescription,
  errorMessage,
  emptyTitle,
  emptyMessage,
  hasItems,
  children,
  continuationHref,
  continuationLabel = "Load more",
  footer,
  debugPayload,
  itemListUrls,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  path: string;
  searchParams: URLSearchParams;
  window: StatsWindow;
  semantics: NativeApiSemantics;
  heroExtraBadges?: ReactNode;
  sectionTitle: string;
  sectionDescription: string;
  errorMessage: string;
  emptyTitle: string;
  emptyMessage: string;
  hasItems: boolean;
  children: ReactNode;
  continuationHref?: string;
  continuationLabel?: string;
  footer?: ReactNode;
  debugPayload: unknown;
  itemListUrls?: string[];
}) {
  return (
    <div className="space-y-8">
      {itemListUrls && itemListUrls.length > 0 ? (
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "ItemList",
            name: title,
            itemListElement: itemListUrls.map((url, index) => ({
              "@type": "ListItem",
              position: index + 1,
              url: url.startsWith("http") ? url : absoluteUrl(url),
            })),
          }}
        />
      ) : null}
      <PageHero
        eyebrow={eyebrow}
        title={title}
        subtitle={subtitle}
        badges={
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <WindowSelector path={path} searchParams={searchParams} activeWindow={window} />
            <span className="border-edge-strong text-ink-dim rounded-full border px-2 py-1">
              {formatStatsWindowLabel(window)}
            </span>
            {heroExtraBadges}
          </div>
        }
      />
      <SectionCard title={sectionTitle} description={sectionDescription}>
        {errorMessage && hasItems ? <SoftRefreshNote message={errorMessage} /> : null}
        {errorMessage && !hasItems ? (
          <ErrorPanel message={errorMessage} />
        ) : hasItems ? (
          children
        ) : (
          <EmptyState title={emptyTitle} message={emptyMessage} />
        )}
        {continuationHref ? (
          <Link href={continuationHref} className="text-link mt-3 inline-block text-sm">
            {continuationLabel}
          </Link>
        ) : null}
        {footer}
      </SectionCard>
      <AboutThisData semantics={semantics} />
      <DebugDisclosure title="Debug payload" data={debugPayload ?? {}} />
    </div>
  );
}
