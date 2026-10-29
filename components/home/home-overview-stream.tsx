import { redirect } from "next/navigation";

import { FreshnessBadge } from "@/components/discover/discover-shell";
import { EditorialOverview } from "@/components/discover/overview/editorial-overview";
import { EmptyState } from "@/components/explorer/empty-state";
import { LanguageSelector } from "@/components/explorer/language-selector";
import { ErrorPanel, SoftRefreshNote } from "@/components/ui/status-panels";
import { getStaleDataNotice } from "@/lib/api/http";
import type { HomePageData } from "@/lib/home/load-home-page-data";
import { LANGUAGE_EMPTY_MESSAGE } from "@/lib/search-params/language";
import type { StatsWindow } from "@/lib/search-params/window";
import { formatUpdatedRelative } from "@/lib/time/freshness";

/**
 * Streaming halves of the homepage. The shell (hero, window selector, tabs)
 * renders immediately from `searchParams`; these two async components await
 * the shared home-data promise inside Suspense boundaries so the fan-out never
 * blocks first paint.
 */

function redirectRejectedDiscoveryWindow(href: string | null) {
  if (href) redirect(href);
}

export async function HomeFreshness({ data }: { data: Promise<HomePageData> }) {
  const home = await data;
  redirectRejectedDiscoveryWindow(home.discoveryWindowRedirect);
  const label = formatUpdatedRelative(home.computedAt);
  return label ? <FreshnessBadge label={label} /> : null;
}

export async function HomeLanguageSelector({
  data,
  path,
  query,
  language,
  window,
}: {
  data: Promise<HomePageData>;
  path: string;
  query: string;
  language?: string;
  window: StatsWindow;
}) {
  const home = await data;
  redirectRejectedDiscoveryWindow(home.discoveryWindowRedirect);
  return (
    <LanguageSelector
      path={path}
      query={query}
      activeLanguage={language ?? home.language}
      options={home.topLanguages?.[window] ?? []}
    />
  );
}

export async function HomeOverviewBody({ data }: { data: Promise<HomePageData> }) {
  const home = await data;
  redirectRejectedDiscoveryWindow(home.discoveryWindowRedirect);
  const hasContent =
    home.homeNotes.length > 0 ||
    Boolean(home.mediaLeaders.pictures || home.mediaLeaders.videos || home.mediaLeaders.shorts) ||
    home.hydratedHomeProfiles.length > 0 ||
    home.hydratedHomeRisingProfiles.length > 0 ||
    home.homeHashtags.length > 0 ||
    home.homeDomains.length > 0;
  // Read after the loader has run so last-known-good fallbacks are reflected.
  const staleMessage = getStaleDataNotice();

  return (
    <>
      {staleMessage ? <SoftRefreshNote message={staleMessage} /> : null}
      {home.errorMessage ? (
        hasContent ? (
          <SoftRefreshNote message={home.errorMessage} />
        ) : (
          <ErrorPanel message={home.errorMessage} />
        )
      ) : null}
      {hasContent ? (
        <EditorialOverview
          notes={home.homeNotes}
          mediaLeaders={home.mediaLeaders}
          profiles={home.hydratedHomeProfiles}
          risingProfiles={home.hydratedHomeRisingProfiles}
          hashtags={home.homeHashtags}
          domains={home.homeDomains}
          authorsByPubkey={home.noteAuthorsByPubkey}
          pulseStats={home.pulseStats}
          sectionFailures={home.sectionFailures}
          window={home.window}
          lang={home.language}
        />
      ) : home.language && !home.errorMessage ? (
        <EmptyState message={LANGUAGE_EMPTY_MESSAGE} />
      ) : null}
    </>
  );
}
