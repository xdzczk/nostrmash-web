import Link from "next/link";
import { unstable_rethrow } from "next/navigation";
import { Suspense, type ReactNode } from "react";

import { LoadMoreList, type LoadMoreChunk } from "@/components/data/load-more-list";
import { DiscoverShell } from "@/components/discover/discover-shell";
import { DebugDisclosure } from "@/components/explorer/debug-disclosure";
import { EmptyState } from "@/components/explorer/empty-state";
import { LanguageSelector } from "@/components/explorer/language-selector";
import { AboutThisData } from "@/components/explorer/about-this-data";
import { JsonLd } from "@/components/seo/json-ld";
import { SectionCard } from "@/components/ui/section-card";
import { ErrorPanel, SoftRefreshNote } from "@/components/ui/status-panels";
import type { DiscoverMode, DiscoverView } from "@/lib/discover/views";
import { absoluteUrl } from "@/lib/seo/metadata";
import { LANGUAGE_EMPTY_MESSAGE } from "@/lib/search-params/language";
import type { StatsWindow } from "@/lib/search-params/window";
import type { NativeApiSemantics, TopLanguages } from "@/lib/types/api";

export type RankedListChromeProps = {
  discoverView: DiscoverView;
  discoverMode?: DiscoverMode;
  eyebrow: string;
  title: string;
  subtitle: string;
  path: string;
  searchParams: URLSearchParams;
  window: StatsWindow;
  windows?: readonly StatsWindow[];
  language?: string;
  /** Window and language selectors. Hidden on surfaces that are not ranked. */
  rankingControls?: boolean;
  /** Skip writing the 24h/7d cookie. */
  rememberWindow?: boolean;
  topLanguages?: TopLanguages;
  languageControl?: ReactNode;
  freshness?: ReactNode;
  heroExtraBadges?: ReactNode;
  errorMessage?: string;
  hasContent?: boolean;
  children: ReactNode;
};

/** Hero, window control, and tabs. Renders before a ranking payload resolves. */
export function RankedListChrome({
  discoverView,
  discoverMode = "default",
  eyebrow,
  title,
  subtitle,
  path,
  searchParams,
  window,
  windows,
  language,
  rankingControls = true,
  rememberWindow = true,
  topLanguages,
  languageControl,
  freshness,
  heroExtraBadges,
  errorMessage = "",
  hasContent = true,
  children,
}: RankedListChromeProps) {
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
      windows={windows}
      language={language}
      rankingControls={rankingControls}
      rememberWindow={rememberWindow}
      topLanguages={topLanguages}
      languageControl={languageControl}
      freshness={freshness}
      errorMessage={errorMessage}
      hasContent={hasContent}
      heroSupport={heroExtraBadges}
    >
      {children}
    </DiscoverShell>
  );
}

type RankedLanguageData = Promise<{ payload: unknown }>;

function topLanguagesOf(payload: unknown): TopLanguages | undefined {
  if (!payload || typeof payload !== "object" || !("top_languages" in payload)) return undefined;
  const value = (payload as { top_languages?: TopLanguages }).top_languages;
  if (!value || typeof value !== "object") return undefined;
  return value;
}

export function RankedLanguageControl({
  data,
  path,
  query,
  language,
  window,
}: {
  data: RankedLanguageData;
  path: string;
  query: string;
  language?: string;
  window: StatsWindow;
}) {
  return (
    <Suspense
      fallback={
        <LanguageSelector path={path} query={query} activeLanguage={language} options={[]} />
      }
    >
      <RankedLanguageOptions
        data={data}
        path={path}
        query={query}
        language={language}
        window={window}
      />
    </Suspense>
  );
}

async function RankedLanguageOptions({
  data,
  path,
  query,
  language,
  window,
}: {
  data: RankedLanguageData;
  path: string;
  query: string;
  language?: string;
  window: StatsWindow;
}) {
  let topLanguages: TopLanguages | undefined;
  try {
    topLanguages = topLanguagesOf((await data).payload);
  } catch (error) {
    unstable_rethrow(error);
  }
  return (
    <LanguageSelector
      path={path}
      query={query}
      activeLanguage={language}
      options={topLanguages?.[window] ?? []}
    />
  );
}

export function RankedListStatus({
  errorMessage,
  hasItems,
  path,
  searchParams,
}: {
  errorMessage: string;
  hasItems: boolean;
  path: string;
  searchParams: URLSearchParams;
}) {
  if (!errorMessage) return null;
  const query = searchParams.toString();
  const retryHref = query.length > 0 ? `${path}?${query}` : path;
  return hasItems ? (
    <SoftRefreshNote message={errorMessage} />
  ) : (
    <ErrorPanel message={errorMessage} retryHref={retryHref} />
  );
}

/**
 * Shell first, ranking second. The selected window updates before notes and
 * profile hydration finish, and the list skeleton stays inside the page.
 */
export function RankedListStream({
  data,
  fallback,
  children,
  ...chrome
}: Omit<RankedListChromeProps, "children" | "languageControl" | "errorMessage" | "hasContent"> & {
  data: RankedLanguageData;
  fallback: ReactNode;
  children: ReactNode;
}) {
  const query = chrome.searchParams.toString();
  return (
    <RankedListChrome
      {...chrome}
      errorMessage=""
      hasContent
      languageControl={
        <RankedLanguageControl
          data={data}
          path={chrome.path}
          query={query}
          language={chrome.language}
          window={chrome.window}
        />
      }
    >
      <Suspense
        fallback={
          <div>
            <span className="sr-only" role="status">
              Loading this ranking
            </span>
            {fallback}
          </div>
        }
      >
        {children}
      </Suspense>
    </RankedListChrome>
  );
}

export function RankedListPage({
  discoverView,
  discoverMode = "default",
  eyebrow,
  title,
  subtitle,
  path,
  searchParams,
  window,
  windows,
  language,
  rankingControls = true,
  rememberWindow = true,
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
  windows?: readonly StatsWindow[];
  language?: string;
  /** Window and language selectors. Hidden on surfaces that are not ranked. */
  rankingControls?: boolean;
  /** Skip writing the 24h/7d cookie. */
  rememberWindow?: boolean;
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
  return (
    <RankedListChrome
      discoverView={discoverView}
      discoverMode={discoverMode}
      eyebrow={eyebrow}
      title={title}
      subtitle={subtitle}
      path={path}
      searchParams={searchParams}
      window={window}
      windows={windows}
      language={language}
      rankingControls={rankingControls}
      rememberWindow={rememberWindow}
      topLanguages={topLanguages}
      errorMessage={errorMessage}
      hasContent={hasItems}
      heroExtraBadges={heroExtraBadges}
    >
      <RankedListResults
        title={title}
        language={language}
        semantics={semantics}
        sectionTitle={sectionTitle}
        sectionDescription={sectionDescription}
        errorMessage={errorMessage}
        emptyTitle={emptyTitle}
        emptyMessage={emptyMessage}
        hasItems={hasItems}
        continuationHref={continuationHref}
        continuationLabel={continuationLabel}
        loadMore={loadMore}
        loadMoreCursor={loadMoreCursor}
        footer={footer}
        debugPayload={debugPayload}
        itemListUrls={itemListUrls}
      >
        {children}
      </RankedListResults>
    </RankedListChrome>
  );
}

export function RankedListResults({
  title,
  language,
  semantics,
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
  title: string;
  language?: string;
  semantics: NativeApiSemantics;
  sectionTitle?: string;
  sectionDescription?: string;
  errorMessage: string;
  emptyTitle: string;
  emptyMessage: string;
  hasItems: boolean;
  children: ReactNode;
  continuationHref?: string;
  continuationLabel?: string;
  loadMore?: (cursor: string) => Promise<LoadMoreChunk>;
  loadMoreCursor?: string;
  footer?: ReactNode;
  debugPayload: unknown;
  itemListUrls?: string[];
}) {
  const resolvedEmptyTitle = language ? "" : emptyTitle;
  const resolvedEmptyMessage = language ? LANGUAGE_EMPTY_MESSAGE : emptyMessage;
  return (
    <>
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
    </>
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
