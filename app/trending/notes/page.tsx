import type { Metadata } from "next";
import Link from "next/link";

import { NotesList } from "@/components/data/renderers";
import { RankedListPage } from "@/components/explorer/ranked-list-page";
import { getTrendingNotes } from "@/lib/api/endpoints";
import { extractEventAuthorPubkeys, fetchProfilesByPubkey } from "@/lib/api/profile-hydration";
import { loadRankedListPayload, readRankedListContext } from "@/lib/explorer/ranked-list";
import { buildEntityMetadata } from "@/lib/seo/metadata";
import type { Profile } from "@/lib/types/api";

export const metadata: Metadata = buildEntityMetadata({
  title: "Trending Notes",
  description: "Explore the notes leading the network.",
  path: "/trending/notes",
  rss: { url: "/feeds/trending-notes.xml", title: "Trending notes" },
});

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function TrendingNotesPage({ searchParams }: { searchParams: SearchParams }) {
  const path = "/trending/notes";
  const { cursor, window, currentSearchParams, buildCursorContinuation } = readRankedListContext(
    await searchParams,
    path
  );
  const { payload, errorMessage, semantics } = await loadRankedListPayload(
    () => getTrendingNotes("shortTtl", { cursor, window }),
    "Failed to load trending notes."
  );
  const notes = payload?.notes ?? [];
  const nextCursor = payload?.next_cursor;

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
    <RankedListPage
      eyebrow="Ranked notes"
      title="Trending notes"
      subtitle="The notes leading the network."
      path={path}
      searchParams={currentSearchParams}
      window={window}
      semantics={semantics}
      sectionTitle="Ranked notes"
      sectionDescription="The strongest notes in view."
      errorMessage={errorMessage}
      emptyTitle="No ranked notes yet"
      emptyMessage="Ranked notes have not populated for this window."
      hasItems={notes.length > 0}
      continuationHref={
        typeof nextCursor === "string" && nextCursor.length > 0
          ? buildCursorContinuation(nextCursor)
          : undefined
      }
      continuationLabel="Load more notes"
      itemListUrls={itemListUrls}
      footer={
        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          <Link
            href="/discovery/conversations/hot"
            className="border-edge-strong text-ink-dim hover:text-ink rounded-full border px-2.5 py-1"
          >
            Open hot conversations
          </Link>
          <Link
            href="/trending/long-form"
            className="border-edge-strong text-ink-dim hover:text-ink rounded-full border px-2.5 py-1"
          >
            Open trending long-form
          </Link>
        </div>
      }
      debugPayload={payload ?? {}}
    >
      <NotesList notes={notes} authorsByPubkey={authorsByPubkey} ranked discoverySignals />
    </RankedListPage>
  );
}
