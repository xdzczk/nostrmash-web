import Link from "next/link";
import type { Metadata } from "next";

import { ProfilesList } from "@/components/data/renderers";
import {
  RankedListResults,
  RankedListStatus,
  RankedListStream,
} from "@/components/explorer/ranked-list-page";
import { ProfilesListSkeleton } from "@/components/ui/skeleton";
import { getRisingProfiles } from "@/lib/api/endpoints";
import { hydrateProfiles } from "@/lib/api/profile-hydration";
import { loadMoreRanking } from "@/lib/explorer/load-more-ranking";
import {
  rankedListRequest,
  rankedPageContinuation,
  readRankedOffset,
} from "@/lib/explorer/ranked-pagination";
import {
  loadRankedListPayload,
  readRankedListContext,
  startRankedLoad,
} from "@/lib/explorer/ranked-list";
import { buildLanguageHref, readLanguage } from "@/lib/search-params/language";
import { buildContinuationHref } from "@/lib/search-params/pagination";
import { applyDiscoverLanguage } from "@/lib/search-params/language-preference";
import { withLanguageVariantMetadata } from "@/lib/seo/metadata";
import type { StatsWindow } from "@/lib/search-params/window";
import type { Profile } from "@/lib/types/api";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata({
  searchParams,
}: {
  searchParams: SearchParams;
}): Promise<Metadata> {
  return withLanguageVariantMetadata(
    {
      title: "Up and coming",
      description:
        "Small accounts gaining followers fast or earning outsized engagement relative to their audience.",
    },
    readLanguage(await searchParams),
    "/discovery/profiles/rising"
  );
}

export default async function RisingProfilesPage({ searchParams }: { searchParams: SearchParams }) {
  const path = "/discovery/profiles/rising";
  const resolvedSearchParams = await searchParams;
  const language = await applyDiscoverLanguage(path, resolvedSearchParams);
  const { window, windows, currentSearchParams } = await readRankedListContext(
    resolvedSearchParams,
    path
  );
  const offset = readRankedOffset(resolvedSearchParams);
  const data = startRankedLoad(
    loadRankedListPayload(
      () => getRisingProfiles("shortTtl", rankedListRequest(window, language, offset)),
      "Failed to load rising profiles.",
      { window, path, params: currentSearchParams }
    )
  );

  return (
    <RankedListStream
      data={data}
      discoverView="people"
      discoverMode="rising"
      eyebrow="People"
      title="Up and coming"
      subtitle="Small accounts gaining followers fast, or earning engagement that's large relative to their own audience."
      path={path}
      searchParams={currentSearchParams}
      window={window}
      windows={windows}
      language={language}
      fallback={<ProfilesListSkeleton />}
    >
      <RisingProfilesBody
        data={data}
        path={path}
        searchParams={currentSearchParams}
        window={window}
        language={language}
        offset={offset}
      />
    </RankedListStream>
  );
}

async function RisingProfilesBody({
  data,
  path,
  searchParams,
  window,
  language,
  offset,
}: {
  data: ReturnType<typeof loadRankedListPayload<Awaited<ReturnType<typeof getRisingProfiles>>>>;
  path: string;
  searchParams: URLSearchParams;
  window: StatsWindow;
  language?: string;
  offset: number;
}) {
  const { payload, errorMessage, semantics } = await data;
  const sourceProfiles = payload?.profiles ?? [];
  const continuation = rankedPageContinuation("rising", sourceProfiles, offset);

  let hydratedProfiles: Profile[] = [];
  if (sourceProfiles.length > 0) {
    try {
      hydratedProfiles = await hydrateProfiles(sourceProfiles, "shortTtl");
    } catch {
      hydratedProfiles = sourceProfiles;
    }
  }

  return (
    <>
      <RankedListStatus
        errorMessage={errorMessage}
        hasItems={hydratedProfiles.length > 0}
        path={path}
        searchParams={searchParams}
      />
      <RankedListResults
        title="Up and coming"
        language={language}
        semantics={semantics}
        errorMessage={errorMessage}
        emptyTitle="No up-and-coming profiles available"
        emptyMessage="The API did not return up-and-coming profiles for this window."
        hasItems={hydratedProfiles.length > 0}
        loadMore={loadMoreRanking.bind(null, "rising", window, language ?? "")}
        loadMoreCursor={continuation.token}
        continuationHref={
          continuation.nextOffset != null
            ? buildContinuationHref(path, searchParams, "offset", String(continuation.nextOffset))
            : undefined
        }
        continuationLabel="Load more up-and-coming profiles"
        footer={
          <div className="mt-4 flex flex-wrap gap-2 text-xs">
            <Link
              href={buildLanguageHref(
                "/discovery/conversations/hot",
                new URLSearchParams(),
                language
              )}
              className="border-edge-strong text-ink-dim hover:text-ink rounded-full border px-2.5 py-1"
            >
              Open conversations
            </Link>
            <Link
              href={buildLanguageHref("/trending/profiles", new URLSearchParams(), language)}
              className="border-edge-strong text-ink-dim hover:text-ink rounded-full border px-2.5 py-1"
            >
              See trending profiles
            </Link>
          </div>
        }
        debugPayload={payload ?? {}}
      >
        <ProfilesList profiles={hydratedProfiles} ranked discoverySignals rankOffset={offset} />
      </RankedListResults>
    </>
  );
}
