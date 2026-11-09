import type { Metadata } from "next";

import { ProfilesList } from "@/components/data/renderers";
import {
  RankedListResults,
  RankedListStatus,
  RankedListStream,
} from "@/components/explorer/ranked-list-page";
import { ProfilesListSkeleton } from "@/components/ui/skeleton";
import { getMostFollowedProfiles } from "@/lib/api/endpoints";
import { hydrateProfiles, restoreRankingMetrics } from "@/lib/api/profile-hydration";
import { loadMoreRanking } from "@/lib/explorer/load-more-ranking";
import {
  rankedListRequest,
  rankedPageContinuation,
  readRankedOffset,
} from "@/lib/explorer/ranked-pagination";
import {
  loadRankedListPayload,
  readUnwindowedRankingContext,
  startRankedLoad,
} from "@/lib/explorer/ranked-list";
import { buildContinuationHref } from "@/lib/search-params/pagination";
import { applyDiscoverViewer } from "@/lib/search-params/viewer-preference";
import { readViewer } from "@/lib/search-params/viewer";
import { withLanguageVariantMetadata } from "@/lib/seo/metadata";
import type { Profile } from "@/lib/types/api";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const PATH = "/discovery/profiles/followed";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: SearchParams;
}): Promise<Metadata> {
  return withLanguageVariantMetadata(
    {
      title: "Most followed",
      description:
        "Accounts with a profile, ordered by follower count. Dormant accounts stay in the list.",
    },
    undefined,
    PATH,
    readViewer(await searchParams)
  );
}

export default async function MostFollowedProfilesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const resolvedSearchParams = await searchParams;
  const viewer = await applyDiscoverViewer(PATH, resolvedSearchParams);
  const { window, windows, currentSearchParams, linkedWindow } =
    await readUnwindowedRankingContext(resolvedSearchParams);
  const offset = readRankedOffset(resolvedSearchParams, viewer);
  const data = startRankedLoad(
    loadRankedListPayload(
      () =>
        getMostFollowedProfiles(
          "shortTtl",
          rankedListRequest(undefined, undefined, offset, viewer)
        ),
      "Failed to load most followed profiles."
    )
  );

  return (
    <RankedListStream
      data={data}
      discoverView="people"
      discoverMode="followed"
      eyebrow="People"
      title="Most followed"
      subtitle="Accounts with a profile, ordered by follower count. Dormant accounts stay in the list, including those with fewer than 1,000 followers."
      path={PATH}
      searchParams={currentSearchParams}
      window={window}
      windows={windows}
      showWindowControl={false}
      showLanguageControl={false}
      rememberWindow={false}
      linkedWindow={linkedWindow}
      subtitleFromSm={false}
      fallback={<ProfilesListSkeleton />}
    >
      <MostFollowedProfilesBody data={data} searchParams={currentSearchParams} offset={offset} />
    </RankedListStream>
  );
}

async function MostFollowedProfilesBody({
  data,
  searchParams,
  offset,
}: {
  data: ReturnType<
    typeof loadRankedListPayload<Awaited<ReturnType<typeof getMostFollowedProfiles>>>
  >;
  searchParams: URLSearchParams;
  offset: number;
}) {
  const { payload, errorMessage, semantics } = await data;
  const sourceProfiles = payload?.profiles ?? [];
  const viewer = readViewer({ viewer: searchParams.get("viewer") ?? undefined });
  const continuation = rankedPageContinuation(
    "followed",
    sourceProfiles,
    offset,
    undefined,
    viewer
  );
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
        title="Most followed"
        semantics={semantics}
        errorMessage={errorMessage}
        emptyTitle="No followed accounts yet"
        emptyMessage="This is the follower directory. No profile with followers is in it yet."
        hasItems={profiles.length > 0}
        loadMore={loadMoreRanking.bind(null, "followed", "", "", viewer ?? "")}
        loadMoreCursor={continuation.token}
        continuationHref={
          continuation.nextOffset != null
            ? buildContinuationHref(PATH, searchParams, "offset", String(continuation.nextOffset))
            : undefined
        }
        continuationLabel="Load more followed accounts"
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
