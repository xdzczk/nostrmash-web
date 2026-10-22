import Link from "next/link";
import type { ReactNode } from "react";

import { DiscoverShell } from "@/components/discover/discover-shell";
import { DebugDisclosure } from "@/components/explorer/debug-disclosure";
import { EmptyState } from "@/components/explorer/empty-state";
import { AboutThisData } from "@/components/explorer/about-this-data";
import { JsonLd } from "@/components/seo/json-ld";
import { SectionCard } from "@/components/ui/section-card";
import type { DiscoverMode, DiscoverView } from "@/lib/discover/views";
import { absoluteUrl } from "@/lib/seo/metadata";
import type { StatsWindow } from "@/lib/search-params/window";
import type { NativeApiSemantics } from "@/lib/types/api";

export function RankedListPage({
  discoverView,
  discoverMode = "default",
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
  discoverView: DiscoverView;
  discoverMode?: DiscoverMode;
  eyebrow: string;
  title: string;
  subtitle: string;
  path: string;
  searchParams: URLSearchParams;
  window: StatsWindow;
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
  footer?: ReactNode;
  debugPayload: unknown;
  itemListUrls?: string[];
}) {
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
            emptyTitle={emptyTitle}
            emptyMessage={emptyMessage}
            continuationHref={continuationHref}
            continuationLabel={continuationLabel}
            footer={footer}
          >
            {children}
          </RankedListBody>
        </SectionCard>
      ) : (
        <RankedListBody
          hasItems={hasItems}
          errorMessage={errorMessage}
          emptyTitle={emptyTitle}
          emptyMessage={emptyMessage}
          continuationHref={continuationHref}
          continuationLabel={continuationLabel}
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
  footer,
  children,
}: {
  hasItems: boolean;
  errorMessage: string;
  emptyTitle: string;
  emptyMessage: string;
  continuationHref?: string;
  continuationLabel: string;
  footer?: ReactNode;
  children: ReactNode;
}) {
  return (
    <>
      {hasItems ? (
        children
      ) : errorMessage ? null : (
        <EmptyState title={emptyTitle} message={emptyMessage} />
      )}
      {continuationHref ? (
        <Link
          href={continuationHref}
          className="border-edge/80 text-ink hover:text-accent-ink mt-6 inline-flex min-h-11 items-center gap-2 border-t pt-4 text-sm font-medium"
        >
          {continuationLabel}
          <span aria-hidden>→</span>
        </Link>
      ) : null}
      {footer}
    </>
  );
}
