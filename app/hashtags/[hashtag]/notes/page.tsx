import type { Metadata } from "next";
import Link from "next/link";

import { DebugDisclosure } from "@/components/explorer/debug-disclosure";
import { EmptyState } from "@/components/explorer/empty-state";
import { IdBadge } from "@/components/explorer/id-badge";
import { NativeSemanticsBadges } from "@/components/explorer/native-semantics-badges";
import { PageHero } from "@/components/explorer/page-hero";
import { HashtagsList, NotesList } from "@/components/data/renderers";
import { SectionCard } from "@/components/ui/section-card";
import { ErrorPanel } from "@/components/ui/status-panels";
import { getHashtagNotes, getRelatedHashtags } from "@/lib/api/endpoints";
import { extractNativeApiSemantics } from "@/lib/api/normalize";
import { extractEventAuthorPubkeys, fetchProfilesByPubkey } from "@/lib/api/profile-hydration";
import {
  buildContinuationHref,
  readSearchParam,
  toUrlSearchParams,
} from "@/lib/search-params/pagination";
import type { Profile } from "@/lib/types/api";

type Params = Promise<{ hashtag: string }>;
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

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
    title: `${label} notes`,
    description: `NostrMash note explorer for ${label}.`,
  };
}

export default async function HashtagNotesPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { hashtag } = await params;
  const normalizedHashtag = normalizeHashtagParam(hashtag);
  const resolvedSearchParams = await searchParams;
  const notesCursor = readSearchParam(resolvedSearchParams, "cursor");
  const currentSearchParams = toUrlSearchParams(resolvedSearchParams);
  const errors: string[] = [];
  let hashtagNotesPayload: Awaited<ReturnType<typeof getHashtagNotes>> | null = null;
  let relatedHashtagsPayload: Awaited<ReturnType<typeof getRelatedHashtags>> | null = null;
  let authorsByPubkey: Record<string, Profile> = {};

  const [notesResult, relatedResult] = await Promise.allSettled([
    getHashtagNotes(normalizedHashtag, "shortTtl", { cursor: notesCursor }),
    getRelatedHashtags(normalizedHashtag, "shortTtl"),
  ]);

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

  const notes = hashtagNotesPayload?.notes ?? [];
  const relatedHashtags = relatedHashtagsPayload?.related ?? relatedHashtagsPayload?.hashtags ?? [];
  const notesNextCursor = hashtagNotesPayload?.next_cursor;
  const notesContinuationHref = buildContinuationHref(
    `/hashtags/${encodeURIComponent(normalizedHashtag)}/notes`,
    currentSearchParams,
    "cursor",
    notesNextCursor
  );
  const semantics = extractNativeApiSemantics(hashtagNotesPayload, relatedHashtagsPayload);

  if (notes.length > 0) {
    try {
      authorsByPubkey = await fetchProfilesByPubkey(extractEventAuthorPubkeys(notes), "shortTtl");
    } catch {
      authorsByPubkey = {};
    }
  }

  return (
    <div className="space-y-8">
      <PageHero
        eyebrow="Hashtag notes"
        title={`${hashtagTitle(normalizedHashtag)} notes`}
        subtitle="All available notes returned by the hashtag notes endpoint."
        badges={
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <NativeSemanticsBadges semantics={semantics} />
            <IdBadge id={hashtagTitle(normalizedHashtag)} label="hashtag" />
            {typeof hashtagNotesPayload?.total === "number" ? (
              <span className="rounded-full border border-zinc-700 px-2 py-1 text-zinc-300">
                total: {hashtagNotesPayload.total.toLocaleString()}
              </span>
            ) : null}
            {typeof notesNextCursor === "string" && notesNextCursor.length > 0 ? (
              <span className="rounded-full border border-zinc-700 px-2 py-1 text-zinc-300">
                cursor: available
              </span>
            ) : null}
          </div>
        }
        support={
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/hashtags/${encodeURIComponent(normalizedHashtag)}`}
              className="rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-300 hover:text-zinc-100"
            >
              Open hashtag overview
            </Link>
            <Link
              href={`/search?q=${encodeURIComponent(`#${normalizedHashtag}`)}&tab=notes`}
              className="rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-300 hover:text-zinc-100"
            >
              Search hashtag notes
            </Link>
          </div>
        }
      />

      {errors.length > 0 ? <ErrorPanel message={errors.join(" | ")} /> : null}

      <SectionCard title="Hashtag notes" description="Notes using this hashtag.">
        {notes.length > 0 ? (
          <>
            <NotesList notes={notes} authorsByPubkey={authorsByPubkey} />
            {typeof notesNextCursor === "string" && notesNextCursor.length > 0 ? (
              <div className="mt-4 rounded-md border border-indigo-500/30 bg-indigo-500/10 p-3">
                <p className="text-xs text-indigo-100">More notes are available.</p>
                <Link
                  href={notesContinuationHref}
                  className="mt-2 inline-block rounded-full border border-indigo-500/40 px-3 py-1 text-xs text-indigo-200 hover:text-indigo-100"
                >
                  Continue notes
                </Link>
              </div>
            ) : null}
          </>
        ) : (
          <EmptyState message={`No notes were returned for ${hashtagTitle(normalizedHashtag)}.`} />
        )}
      </SectionCard>

      <SectionCard title="Related hashtags" description="Nearby topics connected to this hashtag.">
        {relatedHashtags.length > 0 ? (
          <HashtagsList hashtags={relatedHashtags} searchable />
        ) : (
          <EmptyState message="No related hashtags were returned for this hashtag." />
        )}
      </SectionCard>

      <div className="space-y-3">
        <DebugDisclosure title="Debug payload: hashtag notes" data={hashtagNotesPayload ?? {}} />
        <DebugDisclosure
          title="Debug payload: related hashtags"
          data={relatedHashtagsPayload ?? {}}
        />
      </div>
    </div>
  );
}
