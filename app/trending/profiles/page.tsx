import type { Metadata } from "next";
import Link from "next/link";

import { ProfilesList } from "@/components/data/renderers";
import { RankedListPage } from "@/components/explorer/ranked-list-page";
import { getTrendingProfiles } from "@/lib/api/endpoints";
import { hydrateProfiles } from "@/lib/api/profile-hydration";
import { loadMoreRanking } from "@/lib/explorer/load-more-ranking";
import {
  rankedListRequest,
  rankedPageContinuation,
  readRankedOffset,
} from "@/lib/explorer/ranked-pagination";
import { loadRankedListPayload, readRankedListContext } from "@/lib/explorer/ranked-list";
import { hexToNpub } from "@/lib/nostr/nip19";
import { buildContinuationHref } from "@/lib/search-params/pagination";
import { buildLanguageHref, readLanguage } from "@/lib/search-params/language";
import { applyDiscoverLanguage } from "@/lib/search-params/language-preference";
import { buildEntityMetadata, withLanguageVariantMetadata } from "@/lib/seo/metadata";
import type { Profile } from "@/lib/types/api";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata({
  searchParams,
}: {
  searchParams: SearchParams;
}): Promise<Metadata> {
  return withLanguageVariantMetadata(
    buildEntityMetadata({
      title: "People",
      description: "Explore the profiles with the strongest momentum.",
      path: "/trending/profiles",
    }),
    readLanguage(await searchParams),
    "/trending/profiles"
  );
}

export default async function TrendingProfilesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const path = "/trending/profiles";
  const resolvedSearchParams = await searchParams;
  const language = await applyDiscoverLanguage(path, resolvedSearchParams);
  const { window, windows, currentSearchParams } = await readRankedListContext(
    resolvedSearchParams,
    path
  );
  const offset = readRankedOffset(resolvedSearchParams);
  const { payload, errorMessage, semantics } = await loadRankedListPayload(
    () => getTrendingProfiles("shortTtl", rankedListRequest(window, language, offset)),
    "Failed to load trending profiles.",
    { window, path, params: currentSearchParams }
  );
  const sourceProfiles = payload?.profiles ?? [];
  const continuation = rankedPageContinuation("profiles", sourceProfiles, offset);

  let hydratedProfiles: Profile[] = [];
  if (sourceProfiles.length > 0) {
    try {
      hydratedProfiles = await hydrateProfiles(sourceProfiles, "shortTtl");
    } catch {
      hydratedProfiles = sourceProfiles;
    }
  }

  const itemListUrls = hydratedProfiles
    .map((profile) => {
      const npub =
        (typeof profile.npub === "string" && profile.npub) ||
        (typeof profile.pubkey === "string" ? hexToNpub(profile.pubkey) : null) ||
        (typeof profile.pubkey === "string" ? profile.pubkey : "");
      return npub ? `/profiles/${encodeURIComponent(npub)}` : "";
    })
    .filter(Boolean);

  return (
    <RankedListPage
      discoverView="people"
      eyebrow=""
      title="People"
      subtitle="The profiles with the strongest momentum."
      path={path}
      searchParams={currentSearchParams}
      window={window}
      windows={windows}
      language={language}
      topLanguages={payload?.top_languages}
      semantics={semantics}
      errorMessage={errorMessage}
      emptyTitle="No ranked profiles yet"
      emptyMessage="Ranked profiles have not populated for this window."
      hasItems={hydratedProfiles.length > 0}
      loadMore={loadMoreRanking.bind(null, "profiles", window, language ?? "")}
      loadMoreCursor={continuation.token}
      continuationHref={
        continuation.nextOffset != null
          ? buildContinuationHref(
              path,
              currentSearchParams,
              "offset",
              String(continuation.nextOffset)
            )
          : undefined
      }
      continuationLabel="Load more profiles"
      itemListUrls={itemListUrls}
      footer={
        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          <Link
            href={buildLanguageHref("/discovery/profiles/rising", new URLSearchParams(), language)}
            className="border-edge-strong text-ink-dim hover:text-ink rounded-full border px-2.5 py-1"
          >
            Open up and coming
          </Link>
        </div>
      }
      debugPayload={payload ?? {}}
    >
      <ProfilesList profiles={hydratedProfiles} ranked discoverySignals rankOffset={offset} />
    </RankedListPage>
  );
}
