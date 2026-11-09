import type { Metadata } from "next";

import { NotesList } from "@/components/data/renderers";
import {
  RankedListResults,
  RankedListStatus,
  RankedListStream,
} from "@/components/explorer/ranked-list-page";
import { NotesListSkeleton } from "@/components/ui/skeleton";
import { getBookmarkedNotes } from "@/lib/api/endpoints";
import { extractEventAuthorPubkeys, fetchProfilesByPubkey } from "@/lib/api/profile-hydration";
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
import { readLanguage } from "@/lib/search-params/language";
import { applyDiscoverLanguage } from "@/lib/search-params/language-preference";
import { buildEntityMetadata, withLanguageVariantMetadata } from "@/lib/seo/metadata";
import type { Profile } from "@/lib/types/api";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const PATH = "/discovery/notes/bookmarked";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: SearchParams;
}): Promise<Metadata> {
  return withLanguageVariantMetadata(
    buildEntityMetadata({
      title: "Most bookmarked",
      description: "Notes and articles people have saved right now.",
      path: PATH,
    }),
    readLanguage(await searchParams),
    PATH
  );
}

export default async function MostBookmarkedNotesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const resolvedSearchParams = await searchParams;
  const language = await applyDiscoverLanguage(PATH, resolvedSearchParams);
  const { window, windows, currentSearchParams, linkedWindow } =
    await readUnwindowedRankingContext(resolvedSearchParams);
  const offset = readRankedOffset(resolvedSearchParams);
  const data = startRankedLoad(
    loadRankedListPayload(
      () => getBookmarkedNotes("shortTtl", rankedListRequest(undefined, language, offset)),
      "Failed to load bookmarked notes."
    )
  );

  return (
    <RankedListStream
      data={data}
      discoverView="notes"
      discoverMode="bookmarked"
      eyebrow=""
      title="Most bookmarked"
      subtitle="Notes and articles people have saved right now. One person counts once, even across several lists. The author's own save does not count, and private bookmarks do not count. Zap counts are lifetime, not this rank."
      path={PATH}
      searchParams={currentSearchParams}
      window={window}
      windows={windows}
      language={language}
      showWindowControl={false}
      rememberWindow={false}
      linkedWindow={linkedWindow}
      subtitleFromSm={false}
      fallback={<NotesListSkeleton />}
    >
      <MostBookmarkedNotesBody
        data={data}
        searchParams={currentSearchParams}
        language={language}
        offset={offset}
      />
    </RankedListStream>
  );
}

async function MostBookmarkedNotesBody({
  data,
  searchParams,
  language,
  offset,
}: {
  data: ReturnType<typeof loadRankedListPayload<Awaited<ReturnType<typeof getBookmarkedNotes>>>>;
  searchParams: URLSearchParams;
  language?: string;
  offset: number;
}) {
  const { payload, errorMessage, semantics } = await data;
  const notes = payload?.notes ?? [];
  const continuation = rankedPageContinuation("bookmarked", notes, offset);

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
        path={PATH}
        searchParams={searchParams}
      />
      <RankedListResults
        title="Most bookmarked"
        language={language}
        semantics={semantics}
        errorMessage={errorMessage}
        emptyTitle="No public bookmarks yet"
        emptyMessage="Saves are current with ingest. Nothing is publicly bookmarked right now."
        hasItems={notes.length > 0}
        loadMore={loadMoreRanking.bind(null, "bookmarked", "", language ?? "")}
        loadMoreCursor={continuation.token}
        continuationHref={
          continuation.nextOffset != null
            ? buildContinuationHref(PATH, searchParams, "offset", String(continuation.nextOffset))
            : undefined
        }
        continuationLabel="Load more bookmarked notes"
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
