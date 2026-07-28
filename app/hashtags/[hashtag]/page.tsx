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
import { isValidHashtag } from "@/lib/hashtags";
import type { Profile } from "@/lib/types/api";
import { toUserFacingErrorMessage } from "@/lib/errors/user-message";
import { buildEntityMetadata } from "@/lib/seo/metadata";

type Params = Promise<{ hashtag: string }>;

function normalizeHashtagParam(value: string): string {
  return decodeURIComponent(value).trim().replace(/^#/, "").toLowerCase();
}

function hashtagTitle(value: string): string {
  const normalized = normalizeHashtagParam(value);
  return normalized.length > 0 ? `#${normalized}` : "#unknown";
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { hashtag } = await params;
  const label = hashtagTitle(hashtag);
  const normalized = normalizeHashtagParam(hashtag);
  return buildEntityMetadata({
    title: label,
    description: `See notes and related hashtags for ${label}.`,
    path: `/hashtags/${encodeURIComponent(normalized || hashtag)}`,
    imagePath: `/hashtags/${encodeURIComponent(normalized || hashtag)}/opengraph-image`,
    rss: {
      url: `/feeds/hashtags/${encodeURIComponent(normalized || hashtag)}.xml`,
      title: `${label} notes`,
    },
  });
}

export default async function HashtagPage({ params }: { params: Params }) {
  const { hashtag } = await params;
  const normalizedHashtag = normalizeHashtagParam(hashtag);
  const errors: string[] = [];
  let hashtagDetailPayload: Awaited<ReturnType<typeof getHashtagDetail>> | null = null;
  let hashtagNotesPayload: Awaited<ReturnType<typeof getHashtagNotes>> | null = null;
  let relatedHashtagsPayload: Awaited<ReturnType<typeof getRelatedHashtags>> | null = null;
  let authorsByPubkey: Record<string, Profile> = {};

  if (!isValidHashtag(normalizedHashtag)) {
    return (
      <div className="space-y-6">
        <PageHero
          eyebrow="Hashtag"
          title={hashtagTitle(hashtag)}
          subtitle="This value is not a valid hashtag. Try a search instead."
        />
        <ErrorPanel
          message={`"${normalizedHashtag || hashtag}" is not a valid hashtag. Use letters, numbers, underscore, or hyphen.`}
        />
        <EmptyState
          title="Search instead"
          message="Names and phrases belong in search, not hashtag pages."
          actions={
            <Link
              href={`/search?q=${encodeURIComponent(hashtag)}`}
              className="text-accent-soft underline-offset-2 hover:underline"
            >
              Open search
            </Link>
          }
        />
      </div>
    );
  }

  const [detailResult, notesResult, relatedResult] = await Promise.allSettled([
    getHashtagDetail(normalizedHashtag, "shortTtl"),
    getHashtagNotes(normalizedHashtag, "shortTtl"),
    getRelatedHashtags(normalizedHashtag, "shortTtl"),
  ]);

  if (detailResult.status === "fulfilled") {
    hashtagDetailPayload = detailResult.value;
  } else {
    errors.push(toUserFacingErrorMessage(detailResult.reason, "Hashtag lookup failed."));
  }
  if (notesResult.status === "fulfilled") {
    hashtagNotesPayload = notesResult.value;
  } else {
    errors.push(toUserFacingErrorMessage(notesResult.reason, "Hashtag notes lookup failed."));
  }
  if (relatedResult.status === "fulfilled") {
    relatedHashtagsPayload = relatedResult.value;
  } else {
    errors.push(toUserFacingErrorMessage(relatedResult.reason, "Related hashtags lookup failed."));
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
      authorsByPubkey = await fetchProfilesByPubkey(extractEventAuthorPubkeys(notes), "shortTtl");
    } catch {
      authorsByPubkey = {};
    }
  }

  return (
    <div className="space-y-8">
      <PageHero
        eyebrow="Hashtag explorer"
        title={hashtagTitle(normalizedHashtag)}
        subtitle="See related notes and nearby topics for this hashtag."
        badges={
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <NativeSemanticsBadges semantics={semantics} />
            <IdBadge id={hashtagTitle(normalizedHashtag)} label="hashtag" />
            {typeof totalMentions === "number" ? (
              <span className="border-edge-strong text-ink-dim rounded-full border px-2 py-1">
                mentions: {totalMentions.toLocaleString()}
              </span>
            ) : null}
            {typeof uniqueAuthors === "number" ? (
              <span className="border-edge-strong text-ink-dim rounded-full border px-2 py-1">
                unique authors: {uniqueAuthors.toLocaleString()}
              </span>
            ) : null}
          </div>
        }
        support={
          <div className="flex flex-wrap gap-2">
            <Link
              href={notesSurfaceHref}
              className="border-edge-strong text-ink-dim hover:text-ink rounded-full border px-3 py-1 text-xs"
            >
              Open full note list
            </Link>
            <Link
              href={`/search?q=${encodeURIComponent(`#${normalizedHashtag}`)}&tab=all`}
              className="border-edge-strong text-ink-dim hover:text-ink rounded-full border px-3 py-1 text-xs"
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
          <StatCard label="notes_total" value={hashtagNotesPayload.total} />
        ) : null}
      </section>

      <SectionCard title="Notes snapshot" description="A preview of notes using this hashtag.">
        {notes.length > 0 ? (
          <div className="space-y-3">
            <NotesList notes={notes.slice(0, 8)} authorsByPubkey={authorsByPubkey} />
            <Link href={notesSurfaceHref} className="text-link inline-block text-sm">
              Open all hashtag notes
            </Link>
          </div>
        ) : (
          <EmptyState message={`No notes were returned for ${hashtagTitle(normalizedHashtag)}.`} />
        )}
      </SectionCard>

      <SectionCard title="Related hashtags" description="Nearby topics connected to this hashtag.">
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
