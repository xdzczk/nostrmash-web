import { FreshnessBadge } from "@/components/discover/discover-shell";
import { EditorialOverview } from "@/components/discover/overview/editorial-overview";
import { ErrorPanel, SoftRefreshNote } from "@/components/ui/status-panels";
import { getStaleDataNotice } from "@/lib/api/http";
import type { HomePageData } from "@/lib/home/load-home-page-data";
import { formatUpdatedRelative } from "@/lib/time/freshness";

/**
 * Streaming halves of the homepage. The shell (hero, window selector, tabs)
 * renders immediately from `searchParams`; these two async components await
 * the shared home-data promise inside Suspense boundaries so the fan-out never
 * blocks first paint.
 */

export async function HomeFreshness({ data }: { data: Promise<HomePageData> }) {
  const home = await data;
  const label = formatUpdatedRelative(home.computedAt);
  return label ? <FreshnessBadge label={label} /> : null;
}

export async function HomeOverviewBody({ data }: { data: Promise<HomePageData> }) {
  const home = await data;
  const hasContent =
    home.homeNotes.length > 0 ||
    home.hydratedHomeProfiles.length > 0 ||
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
          profiles={home.hydratedHomeProfiles}
          risingProfiles={home.hydratedHomeRisingProfiles}
          hashtags={home.homeHashtags}
          domains={home.homeDomains}
          authorsByPubkey={home.noteAuthorsByPubkey}
          pulseStats={home.pulseStats}
          sectionFailures={home.sectionFailures}
          window={home.window}
        />
      ) : null}
    </>
  );
}
