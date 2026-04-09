import type { Metadata } from "next";
import Link from "next/link";

import { DebugDisclosure } from "@/components/explorer/debug-disclosure";
import { EmptyState } from "@/components/explorer/empty-state";
import { IdBadge } from "@/components/explorer/id-badge";
import { NativeSemanticsBadges } from "@/components/explorer/native-semantics-badges";
import { PageHero } from "@/components/explorer/page-hero";
import { StatCard } from "@/components/explorer/stat-card";
import { HashtagsList, NotesList } from "@/components/data/renderers";
import { SectionCard } from "@/components/ui/section-card";
import { ErrorPanel } from "@/components/ui/status-panels";
import { getHashtagDetail, getHashtagNotes, getRelatedHashtags } from "@/lib/api/endpoints";
import { extractNativeApiSemantics } from "@/lib/api/normalize";
import { extractEventAuthorPubkeys, fetchProfilesByPubkey } from "@/lib/api/profile-hydration";
import type { Profile } from "@/lib/types/api";

type Params = Promise<{ hashtag: string }>;

function normalizeHashtagParam(value: string): string {
  return decodeURIComponent(value).trim().replace(/^#/, "");
}

function hashtagTitle(value: string): string {
  const normalized = normalizeHashtagParam(value);
  return normalized.length > 0 ? `#${normalized}` : "#unknown";
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { hashtag } = await params;
  const label = hashtagTitle(hashtag);
  return {
    title: `${label} explorer`,
    description: `NostrMash hashtag explorer for ${label}, including note activity and related hashtags.`,
  };
}

export default async function HashtagPage({ params }: { params: Params }) {
  const { hashtag } = await params;
  const normalizedHashtag = normalizeHashtagParam(hashtag);
  const errors: string[] = [];
  let hashtagDetailPayload: Awaited<ReturnType<typeof getHashtagDetail>> | null = null;
  let hashtagNotesPayload: Awaited<ReturnType<typeof getHashtagNotes>> | null = null;
  let relatedHashtagsPayload: Awaited<ReturnType<typeof getRelatedHashtags>> | null = null;
  let authorsByPubkey: Record<string, Profile> = {};

  const [detailResult, notesResult, relatedResult] = await Promise.allSettled([
    getHashtagDetail(normalizedHashtag, "requestTime"),
    getHashtagNotes(normalizedHashtag, "requestTime"),
    getRelatedHashtags(normalizedHashtag, "requestTime"),
  ]);

  if (detailResult.status === "fulfilled") {
    hashtagDetailPayload = detailResult.value;
  } else {
    errors.push(
      detailResult.reason instanceof Error ? detailResult.reason.message : "Hashtag lookup failed."
    );
  }
  if (notesResult.status === "fulfilled") {
    hashtagNotesPayload = notesResult.value;
  } else {
    errors.push(
      notesResult.reason instanceof Error
        ? notesResult.reason.message
        : "Hashtag notes lookup failed."
    );
  }
  if (relatedResult.status === "fulfilled") {
    relatedHashtagsPayload = relatedResult.value;
  } else {
    errors.push(
      relatedResult.reason instanceof Error
        ? relatedResult.reason.message
        : "Related hashtags lookup failed."
    );
  }

  const notes = hashtagNotesPayload?.notes ?? hashtagDetailPayload?.notes ?? [];
  const relatedHashtags =
    relatedHashtagsPayload?.related ??
    relatedHashtagsPayload?.hashtags ??
    hashtagDetailPayload?.related ??
    [];
  const semantics = extractNativeApiSemantics(
    hashtagDetailPayload,
    hashtagNotesPayload,
    relatedHashtagsPayload
  );
  const totalMentions =
    hashtagDetailPayload?.count ?? hashtagDetailPayload?.event_count ?? hashtagNotesPayload?.total;
  const uniqueAuthors = hashtagDetailPayload?.unique_authors;
  const notesSurfaceBaseHref = `/hashtags/${encodeURIComponent(normalizedHashtag)}/notes`;
  const notesSurfaceHref =
    typeof hashtagNotesPayload?.next_cursor === "string" &&
    hashtagNotesPayload.next_cursor.length > 0
      ? `${notesSurfaceBaseHref}?cursor=${encodeURIComponent(hashtagNotesPayload.next_cursor)}`
      : notesSurfaceBaseHref;
  if (notes.length > 0) {
    try {
      authorsByPubkey = await fetchProfilesByPubkey(
        extractEventAuthorPubkeys(notes),
        "requestTime"
      );
    } catch {
      authorsByPubkey = {};
    }
  }

  return (
    <div className="space-y-8">
      <PageHero
        eyebrow="Hashtag explorer"
        title={hashtagTitle(normalizedHashtag)}
        subtitle="Inspect hashtag-level trends, related tags, and connected notes."
        badges={
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <NativeSemanticsBadges semantics={semantics} />
            <IdBadge id={hashtagTitle(normalizedHashtag)} label="hashtag" />
            {typeof totalMentions === "number" ? (
              <span className="rounded-full border border-zinc-700 px-2 py-1 text-zinc-300">
                mentions: {totalMentions.toLocaleString()}
              </span>
            ) : null}
            {typeof uniqueAuthors === "number" ? (
              <span className="rounded-full border border-zinc-700 px-2 py-1 text-zinc-300">
                unique authors: {uniqueAuthors.toLocaleString()}
              </span>
            ) : null}
          </div>
        }
        support={
          <div className="flex flex-wrap gap-2">
            <Link
              href={notesSurfaceHref}
              className="rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-300 hover:text-zinc-100"
            >
              Open full notes surface
            </Link>
            <Link
              href={`/search?q=${encodeURIComponent(`#${normalizedHashtag}`)}&tab=all`}
              className="rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-300 hover:text-zinc-100"
            >
              Search this hashtag
            </Link>
          </div>
        }
      />

      {errors.length > 0 ? <ErrorPanel message={errors.join(" | ")} /> : null}

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {typeof totalMentions === "number" ? (
          <StatCard label="mentions" value={totalMentions} />
        ) : null}
        {typeof uniqueAuthors === "number" ? (
          <StatCard label="unique_authors" value={uniqueAuthors} />
        ) : null}
        {typeof hashtagNotesPayload?.total === "number" ? (
          <StatCard label="notes_surface_total" value={hashtagNotesPayload.total} />
        ) : null}
      </section>

      <SectionCard
        title="Notes snapshot"
        description="A short preview of notes currently associated with this hashtag."
      >
        {notes.length > 0 ? (
          <div className="space-y-3">
            <NotesList notes={notes.slice(0, 8)} authorsByPubkey={authorsByPubkey} />
            <Link href={notesSurfaceHref} className="inline-block text-sm text-indigo-300">
              Open hashtag notes surface
            </Link>
          </div>
        ) : (
          <EmptyState message={`No notes were returned for ${hashtagTitle(normalizedHashtag)}.`} />
        )}
      </SectionCard>

      <SectionCard
        title="Related hashtags"
        description="Related tags from backend discovery relationships."
      >
        {relatedHashtags.length > 0 ? (
          <HashtagsList hashtags={relatedHashtags} searchable />
        ) : (
          <EmptyState message="No related hashtags were returned for this hashtag yet." />
        )}
      </SectionCard>

      <div className="space-y-3">
        <DebugDisclosure title="Debug payload: hashtag detail" data={hashtagDetailPayload ?? {}} />
        <DebugDisclosure title="Debug payload: hashtag notes" data={hashtagNotesPayload ?? {}} />
        <DebugDisclosure
          title="Debug payload: related hashtags"
          data={relatedHashtagsPayload ?? {}}
        />
      </div>
    </div>
  );
}
