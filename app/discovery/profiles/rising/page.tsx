import Link from "next/link";
import type { Metadata } from "next";

import { ProfilesList } from "@/components/data/renderers";
import { RankedListPage } from "@/components/explorer/ranked-list-page";
import { getRisingProfiles } from "@/lib/api/endpoints";
import { hydrateProfiles } from "@/lib/api/profile-hydration";
import { loadRankedListPayload, readRankedListContext } from "@/lib/explorer/ranked-list";
import { buildLanguageHref, readLanguage } from "@/lib/search-params/language";
import { applyDiscoverLanguage } from "@/lib/search-params/language-preference";
import { withLanguageVariantMetadata } from "@/lib/seo/metadata";
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
  const { cursor, window, currentSearchParams, buildCursorContinuation } = readRankedListContext(
    resolvedSearchParams,
    path
  );
  const { payload, errorMessage, semantics } = await loadRankedListPayload(
    () =>
      getRisingProfiles("shortTtl", { cursor, window, ...(language ? { lang: language } : {}) }),
    "Failed to load rising profiles."
  );
  const sourceProfiles = payload?.profiles ?? [];
  const nextCursor = payload?.next_cursor;

  let hydratedProfiles: Profile[] = [];
  if (sourceProfiles.length > 0) {
    try {
      hydratedProfiles = await hydrateProfiles(sourceProfiles, "shortTtl");
    } catch {
      hydratedProfiles = sourceProfiles;
    }
  }

  return (
    <RankedListPage
      discoverView="people"
      discoverMode="rising"
      eyebrow="People"
      title="Up and coming"
      subtitle="Small accounts gaining followers fast, or earning engagement that's large relative to their own audience."
      path={path}
      searchParams={currentSearchParams}
      window={window}
      language={language}
      topLanguages={payload?.top_languages}
      semantics={semantics}
      errorMessage={errorMessage}
      emptyTitle="No up-and-coming profiles available"
      emptyMessage="The API did not return up-and-coming profiles for this window."
      hasItems={hydratedProfiles.length > 0}
      continuationHref={
        typeof nextCursor === "string" && nextCursor.length > 0
          ? buildCursorContinuation(nextCursor)
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
            Open hot conversations
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
      <ProfilesList profiles={hydratedProfiles} ranked discoverySignals />
    </RankedListPage>
  );
}
