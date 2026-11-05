import type { Metadata } from "next";

import { NotesList } from "@/components/data/renderers";
import {
  RankedListResults,
  RankedListStatus,
  RankedListStream,
} from "@/components/explorer/ranked-list-page";
import { NotesListSkeleton } from "@/components/ui/skeleton";
import { getMostZappedNotes } from "@/lib/api/endpoints";
import { extractEventAuthorPubkeys, fetchProfilesByPubkey } from "@/lib/api/profile-hydration";
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
import { readExcludeBridged, readLanguage } from "@/lib/search-params/language";
import { applyDiscoverLanguage } from "@/lib/search-params/language-preference";
import { formatStatsWindowSpan, type StatsWindow } from "@/lib/search-params/window";
import { buildEntityMetadata, withLanguageVariantMetadata } from "@/lib/seo/metadata";
import type { Profile } from "@/lib/types/api";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const PATH = "/discovery/notes/zapped";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: SearchParams;
}): Promise<Metadata> {
  return withLanguageVariantMetadata(
    buildEntityMetadata({
      title: "Most zapped",
      description: "Root notes and articles by the sats they received in the selected window.",
      path: PATH,
    }),
    readLanguage(await searchParams),
    PATH
  );
}

export default async function MostZappedNotesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const resolvedSearchParams = await searchParams;
  const language = await applyDiscoverLanguage(PATH, resolvedSearchParams);
  const { window, windows, currentSearchParams, pageDefault, rememberWindow, linkedWindow } =
    await readWindowedRankingContext(resolvedSearchParams, PATH, "7d");
  const offset = readRankedOffset(resolvedSearchParams);
  const data = startRankedLoad(
    loadRankedListPayload(
      () =>
        getMostZappedNotes(
          "shortTtl",
          rankedListRequest(window, language, offset, readExcludeBridged(resolvedSearchParams))
        ),
      "Failed to load most zapped notes.",
      { window, path: PATH, params: currentSearchParams }
    )
  );

  return (
    <RankedListStream
      data={data}
      discoverView="notes"
      discoverMode="zapped"
      eyebrow=""
      title="Most zapped"
      subtitle={`Root notes and articles by the sats they received ${formatStatsWindowSpan(window)}. The zap figure on each note is for that window. Replies, reposts, and reactions are lifetime.`}
      path={PATH}
      searchParams={currentSearchParams}
      window={window}
      windows={windows}
      language={language}
      defaultWindow={pageDefault}
      rememberWindow={rememberWindow}
      linkedWindow={linkedWindow}
      subtitleFromSm={false}
      fallback={<NotesListSkeleton />}
    >
      <MostZappedNotesBody
        data={data}
        searchParams={currentSearchParams}
        window={window}
        language={language}
        offset={offset}
      />
    </RankedListStream>
  );
}

async function MostZappedNotesBody({
  data,
  searchParams,
  window,
  language,
  offset,
}: {
  data: ReturnType<typeof loadRankedListPayload<Awaited<ReturnType<typeof getMostZappedNotes>>>>;
  searchParams: URLSearchParams;
  window: StatsWindow;
  language?: string;
  offset: number;
}) {
  const { payload, errorMessage, semantics } = await data;
  const notes = payload?.notes ?? [];
  const continuation = rankedPageContinuation("zapped", notes, offset);

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
        title="Most zapped"
        language={language}
        semantics={semantics}
        errorMessage={errorMessage}
        emptyTitle="No zapped notes yet"
        emptyMessage="This list stays empty until the worker rewrites it, once at startup and then about every 5 minutes."
        hasItems={notes.length > 0}
        loadMore={loadMoreRanking.bind(
          null,
          "zapped",
          window,
          language ?? "",
          readExcludeBridged(searchParams)
        )}
        loadMoreCursor={continuation.token}
        continuationHref={
          continuation.nextOffset != null
            ? buildContinuationHref(PATH, searchParams, "offset", String(continuation.nextOffset))
            : undefined
        }
        continuationLabel="Load more zapped notes"
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
