import type { Metadata } from "next";

import { ProfilesList } from "@/components/data/renderers";
import {
  RankedListResults,
  RankedListStatus,
  RankedListStream,
} from "@/components/explorer/ranked-list-page";
import { ProfilesListSkeleton } from "@/components/ui/skeleton";
import { getMostSupportedProfiles } from "@/lib/api/endpoints";
import { hydrateProfiles, restoreRankingMetrics } from "@/lib/api/profile-hydration";
import { loadMoreRanking } from "@/lib/explorer/load-more-ranking";
import {
  rankedListRequest,
  rankedPageContinuation,
  readRankedOffset,
} from "@/lib/explorer/ranked-pagination";
import {
  loadRankedListPayload,
  readWindowedRankingContext,
  startRankedLoad,
} from "@/lib/explorer/ranked-list";
import { buildContinuationHref } from "@/lib/search-params/pagination";
import { readExcludeBridged } from "@/lib/search-params/language";
import { formatStatsWindowSpan, type StatsWindow } from "@/lib/search-params/window";
import type { Profile } from "@/lib/types/api";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const PATH = "/discovery/profiles/supported";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Most supported",
    description:
      "Accounts by sats received in the window, after each sender is capped at 100,000 sats.",
  };
}

export default async function MostSupportedProfilesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const resolvedSearchParams = await searchParams;
  const { window, windows, currentSearchParams, pageDefault, rememberWindow, linkedWindow } =
    await readWindowedRankingContext(resolvedSearchParams, PATH, "30d");
  const offset = readRankedOffset(resolvedSearchParams);
  const data = startRankedLoad(
    loadRankedListPayload(
      () =>
        getMostSupportedProfiles(
          "shortTtl",
          rankedListRequest(window, undefined, offset, readExcludeBridged(resolvedSearchParams))
        ),
      "Failed to load most supported profiles.",
      { window, path: PATH, params: currentSearchParams }
    )
  );

  return (
    <RankedListStream
      data={data}
      discoverView="people"
      discoverMode="supported"
      eyebrow="People"
      title="Most supported"
      subtitle={`Sats received ${formatStatsWindowSpan(window)} after each sender is capped at 100,000 sats. Three people sending 50,000 outrank one person sending 500,000. The amount under each name is that capped total.`}
      path={PATH}
      searchParams={currentSearchParams}
      window={window}
      windows={windows}
      showLanguageControl={false}
      defaultWindow={pageDefault}
      rememberWindow={rememberWindow}
      linkedWindow={linkedWindow}
      subtitleFromSm={false}
      fallback={<ProfilesListSkeleton />}
    >
      <MostSupportedProfilesBody
        data={data}
        searchParams={currentSearchParams}
        window={window}
        offset={offset}
      />
    </RankedListStream>
  );
}

async function MostSupportedProfilesBody({
  data,
  searchParams,
  window,
  offset,
}: {
  data: ReturnType<
    typeof loadRankedListPayload<Awaited<ReturnType<typeof getMostSupportedProfiles>>>
  >;
  searchParams: URLSearchParams;
  window: StatsWindow;
  offset: number;
}) {
  const { payload, errorMessage, semantics } = await data;
  const sourceProfiles = payload?.profiles ?? [];
  const continuation = rankedPageContinuation("supported", sourceProfiles, offset);
  const profiles = await withRankingMetrics(sourceProfiles);

  return (
    <>
      <RankedListStatus
        errorMessage={errorMessage}
        hasItems={profiles.length > 0}
        path={PATH}
        searchParams={searchParams}
      />
      <RankedListResults
        title="Most supported"
        semantics={semantics}
        errorMessage={errorMessage}
        emptyTitle="No supported accounts yet"
        emptyMessage="This list stays empty until the worker rewrites it, once at startup and then about every 5 minutes."
        hasItems={profiles.length > 0}
        loadMore={loadMoreRanking.bind(
          null,
          "supported",
          window,
          "",
          readExcludeBridged(searchParams)
        )}
        loadMoreCursor={continuation.token}
        continuationHref={
          continuation.nextOffset != null
            ? buildContinuationHref(PATH, searchParams, "offset", String(continuation.nextOffset))
            : undefined
        }
        continuationLabel="Load more supported accounts"
        debugPayload={payload ?? {}}
      >
        <ProfilesList profiles={profiles} ranked discoverySignals rankOffset={offset} />
      </RankedListResults>
    </>
  );
}

async function withRankingMetrics(source: Profile[]): Promise<Profile[]> {
  if (source.length === 0) return [];
  try {
    const hydrated = await hydrateProfiles(source, "shortTtl");
    return hydrated.map((profile, index) =>
      restoreRankingMetrics(source[index] ?? profile, profile)
    );
  } catch {
    return source;
  }
}
