import type { Metadata } from "next";

import { NotesList } from "@/components/data/renderers";
import {
  RankedListResults,
  RankedListStatus,
  RankedListStream,
} from "@/components/explorer/ranked-list-page";
import { NotesListSkeleton } from "@/components/ui/skeleton";
import { getTrendingNotes } from "@/lib/api/endpoints";
import { extractEventAuthorPubkeys, fetchProfilesByPubkey } from "@/lib/api/profile-hydration";
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
import { buildContinuationHref } from "@/lib/search-params/pagination";
import { readLanguage } from "@/lib/search-params/language";
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
      title: "Notes",
      description: "Explore the notes leading the network.",
      path: "/trending/notes",
      rss: { url: "/feeds/trending-notes.xml", title: "Trending notes" },
    }),
    readLanguage(await searchParams),
    "/trending/notes"
  );
}

export default async function TrendingNotesPage({ searchParams }: { searchParams: SearchParams }) {
  const path = "/trending/notes";
  const resolvedSearchParams = await searchParams;
  const language = await applyDiscoverLanguage(path, resolvedSearchParams);
  const { window, windows, currentSearchParams } = await readRankedListContext(
    resolvedSearchParams,
    path
  );
  const offset = readRankedOffset(resolvedSearchParams);
  const data = startRankedLoad(
    loadRankedListPayload(
      () => getTrendingNotes("shortTtl", rankedListRequest(window, language, offset)),
      "Failed to load trending notes.",
      { window, path, params: currentSearchParams }
    )
  );

  return (
    <RankedListStream
      data={data}
      discoverView="notes"
      eyebrow=""
      title="Notes"
      subtitle="The notes leading the network."
      path={path}
      searchParams={currentSearchParams}
      window={window}
      windows={windows}
      language={language}
      fallback={<NotesListSkeleton />}
    >
      <TrendingNotesBody
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

async function TrendingNotesBody({
  data,
  path,
  searchParams,
  window,
  language,
  offset,
}: {
  data: ReturnType<typeof loadRankedListPayload<Awaited<ReturnType<typeof getTrendingNotes>>>>;
  path: string;
  searchParams: URLSearchParams;
  window: Awaited<ReturnType<typeof readRankedListContext>>["window"];
  language?: string;
  offset: number;
}) {
  const { payload, errorMessage, semantics } = await data;
  const notes = payload?.notes ?? [];
  const continuation = rankedPageContinuation("notes", notes, offset);

  let authorsByPubkey: Record<string, Profile> = {};
  if (notes.length > 0) {
    try {
      authorsByPubkey = await fetchProfilesByPubkey(extractEventAuthorPubkeys(notes), "shortTtl");
    } catch {
      authorsByPubkey = {};
    }
  }

  const itemListUrls = notes
    .map((note) => {
      const id =
        (typeof note.id === "string" && note.id) ||
        (typeof note.event_id === "string" && note.event_id) ||
        "";
      return id ? `/notes/${encodeURIComponent(id)}` : "";
    })
    .filter(Boolean);

  return (
    <>
      <RankedListStatus
        errorMessage={errorMessage}
        hasItems={notes.length > 0}
        path={path}
        searchParams={searchParams}
      />
      <RankedListResults
        title="Notes"
        language={language}
        semantics={semantics}
        errorMessage={errorMessage}
        emptyTitle="No ranked notes yet"
        emptyMessage="Ranked notes have not populated for this window."
        hasItems={notes.length > 0}
        loadMore={loadMoreRanking.bind(null, "notes", window, language ?? "")}
        loadMoreCursor={continuation.token}
        continuationHref={
          continuation.nextOffset != null
            ? buildContinuationHref(path, searchParams, "offset", String(continuation.nextOffset))
            : undefined
        }
        continuationLabel="Load more notes"
        itemListUrls={itemListUrls}
        debugPayload={payload ?? {}}
      >
        <NotesList
          notes={notes}
          authorsByPubkey={authorsByPubkey}
          ranked
          discoverySignals
          rankOffset={offset}
        />
      </RankedListResults>
    </>
  );
}
