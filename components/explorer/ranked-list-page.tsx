import Link from "next/link";
import type { ReactNode } from "react";

import { LoadMoreList, type LoadMoreChunk } from "@/components/data/load-more-list";
import { DiscoverShell } from "@/components/discover/discover-shell";
import { DebugDisclosure } from "@/components/explorer/debug-disclosure";
import { EmptyState } from "@/components/explorer/empty-state";
import { AboutThisData } from "@/components/explorer/about-this-data";
import { JsonLd } from "@/components/seo/json-ld";
import { SectionCard } from "@/components/ui/section-card";
import type { DiscoverMode, DiscoverView } from "@/lib/discover/views";
import { absoluteUrl } from "@/lib/seo/metadata";
import { LANGUAGE_EMPTY_MESSAGE } from "@/lib/search-params/language";
import type { StatsWindow } from "@/lib/search-params/window";
import type { NativeApiSemantics, TopLanguages } from "@/lib/types/api";

export function RankedListPage({
  discoverView,
  discoverMode = "default",
  eyebrow,
  title,
  subtitle,
  path,
  searchParams,
  window,
  language,
  topLanguages,
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
  loadMore,
  loadMoreCursor,
  footer,
  debugPayload,
  itemListUrls,
}: {
  discoverView: DiscoverView;
  discoverMode?: DiscoverMode;
  eyebrow: string;
  title: string;
  subtitle: string;
  path: string;
  searchParams: URLSearchParams;
  window: StatsWindow;
  language?: string;
  topLanguages?: TopLanguages;
  semantics: NativeApiSemantics;
  heroExtraBadges?: ReactNode;
  sectionTitle?: string;
  sectionDescription?: string;
  errorMessage: string;
  emptyTitle: string;
  emptyMessage: string;
  hasItems: boolean;
  children: ReactNode;
  continuationHref?: string;
  continuationLabel?: string;
  /** Appends the next offset page in place as the reader scrolls. */
  loadMore?: (cursor: string) => Promise<LoadMoreChunk>;
  loadMoreCursor?: string;
  footer?: ReactNode;
  debugPayload: unknown;
  itemListUrls?: string[];
}) {
  const resolvedEmptyTitle = language ? "" : emptyTitle;
  const resolvedEmptyMessage = language ? LANGUAGE_EMPTY_MESSAGE : emptyMessage;
  return (
    <DiscoverShell
      view={discoverView}
      mode={discoverMode}
      eyebrow={eyebrow}
      title={title}
      subtitle={subtitle}
      path={path}
      searchParams={searchParams}
      window={window}
      language={language}
      topLanguages={topLanguages}
      errorMessage={errorMessage}
      hasContent={hasItems}
      heroSupport={heroExtraBadges}
    >
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
      {sectionTitle ? (
        <SectionCard title={sectionTitle} description={sectionDescription}>
          <RankedListBody
            hasItems={hasItems}
            errorMessage={errorMessage}
            emptyTitle={resolvedEmptyTitle}
            emptyMessage={resolvedEmptyMessage}
            continuationHref={continuationHref}
            continuationLabel={continuationLabel}
            loadMore={loadMore}
            loadMoreCursor={loadMoreCursor}
            footer={footer}
          >
            {children}
          </RankedListBody>
        </SectionCard>
      ) : (
        <RankedListBody
          hasItems={hasItems}
          errorMessage={errorMessage}
          emptyTitle={resolvedEmptyTitle}
          emptyMessage={resolvedEmptyMessage}
          continuationHref={continuationHref}
          continuationLabel={continuationLabel}
          loadMore={loadMore}
          loadMoreCursor={loadMoreCursor}
          footer={footer}
        >
          {children}
        </RankedListBody>
      )}
      <AboutThisData semantics={semantics} />
      <DebugDisclosure title="Debug payload" data={debugPayload ?? {}} />
    </DiscoverShell>
  );
}

function RankedListBody({
  hasItems,
  errorMessage,
  emptyTitle,
  emptyMessage,
  continuationHref,
  continuationLabel,
  loadMore,
  loadMoreCursor,
  footer,
  children,
}: {
  hasItems: boolean;
  errorMessage: string;
  emptyTitle: string;
  emptyMessage: string;
  continuationHref?: string;
  continuationLabel: string;
  loadMore?: (cursor: string) => Promise<LoadMoreChunk>;
  loadMoreCursor?: string;
  footer?: ReactNode;
  children: ReactNode;
}) {
  const linkClass =
    "border-edge/80 text-ink hover:text-accent-ink mt-6 inline-flex min-h-11 items-center gap-2 border-t pt-4 text-sm font-medium";
  return (
    <>
      {hasItems ? (
        children
      ) : errorMessage ? null : (
        <EmptyState title={emptyTitle} message={emptyMessage} />
      )}
      {loadMore && loadMoreCursor ? (
        <>
          <LoadMoreList
            key={loadMoreCursor}
            auto
            initialCursor={loadMoreCursor}
            loadMore={loadMore}
            label={continuationLabel}
          />
          {continuationHref ? (
            <noscript>
              <Link href={continuationHref} className={linkClass}>
                {continuationLabel}
                <span aria-hidden>→</span>
              </Link>
            </noscript>
          ) : null}
        </>
      ) : continuationHref ? (
        <Link href={continuationHref} className={linkClass}>
          {continuationLabel}
          <span aria-hidden>→</span>
        </Link>
      ) : null}
      {footer}
    </>
  );
}
