import { EventByline } from "@/components/explorer/event-byline";
import { NoteContent, type NoteContentResolution } from "@/components/explorer/note-content";
import { NoteLinkPreviews } from "@/components/explorer/note-link-previews";
import { NoteMedia } from "@/components/explorer/note-media";
import { getNotePreviewPresentation } from "@/components/explorer/note-preview";
import { profileLabel, truncateIdentifier } from "@/components/explorer/utils";
import { getEventComments } from "@/lib/api/endpoints";
import { extractEventAuthorPubkeys, fetchProfilesByPubkey } from "@/lib/api/profile-hydration";
import { extractNoteMediaAttachments, stripNoteMediaUrls } from "@/lib/notes/media";
import { extractImetaAttachments } from "@/lib/notes/media-event";
import { resolveContentReferences } from "@/lib/notes/resolve-content-refs";
import { tokenizeNoteContent } from "@/lib/notes/tokenize";
import type { EventRecord, Profile } from "@/lib/types/api";

function commentAuthorLabel(comment: EventRecord, author?: Profile): string {
  if (author) return profileLabel(author);
  if (typeof comment.pubkey === "string" && comment.pubkey.length > 0) {
    return truncateIdentifier(comment.pubkey, "pubkey", "secondary");
  }
  return "Unknown author";
}

function CommentBody({
  comment,
  resolution,
}: {
  comment: EventRecord;
  resolution: NoteContentResolution;
}) {
  const content = typeof comment.content === "string" ? comment.content : "";
  const imeta = extractImetaAttachments(comment.tags);
  const hasMedia = extractNoteMediaAttachments(content).length > 0 || imeta.length > 0;
  if (content.trim().length === 0 && !hasMedia) return null;

  const mediaFirst = content.length > 0 && getNotePreviewPresentation(comment).prefersMediaFirst;
  const text =
    content.trim().length > 0 ? (
      <NoteContent
        tokens={tokenizeNoteContent(content, { tags: comment.tags })}
        className="mt-2 [display:block] overflow-visible whitespace-pre-wrap"
        showQuotes
        resolution={resolution}
        hideLinkPreviewUrls={imeta.map((item) => item.url)}
        size="reply"
      />
    ) : null;
  const media = hasMedia ? (
    <NoteMedia content={content} tags={comment.tags} variant="thread" />
  ) : null;
  const links =
    content.length > 0 ? (
      <NoteLinkPreviews
        content={stripNoteMediaUrls(
          content,
          content,
          imeta.map((item) => item.url)
        )}
        limit={2}
      />
    ) : null;

  return (
    <>
      {mediaFirst ? media : null}
      {mediaFirst ? links : null}
      {text}
      {mediaFirst ? null : media}
      {mediaFirst ? null : links}
    </>
  );
}

/** Kind 1111 comments for one parent event. Absent when the list is empty. */
export async function EventComments({ eventId }: { eventId: string }) {
  let comments: EventRecord[] = [];
  try {
    const payload = await getEventComments(eventId, "shortTtl");
    comments = payload.comments ?? [];
  } catch {
    return null;
  }
  if (comments.length === 0) return null;

  const [authorsByPubkey, contentResolution] = await Promise.all([
    fetchProfilesByPubkey(extractEventAuthorPubkeys(comments), "shortTtl").catch(
      () => ({}) as Record<string, Profile>
    ),
    resolveContentReferences(comments).catch(
      () => ({ profilesByPubkey: {}, eventsById: {} }) satisfies NoteContentResolution
    ),
  ]);

  const knownProfiles = new Set(
    [...Object.keys(authorsByPubkey), ...Object.keys(contentResolution.profilesByPubkey ?? {})].map(
      (key) => key.toLowerCase()
    )
  );
  const quotedAuthorPubkeys = Object.values(contentResolution.eventsById ?? {})
    .map((event) => (typeof event?.pubkey === "string" ? event.pubkey : ""))
    .filter((pubkey) => pubkey.length > 0 && !knownProfiles.has(pubkey.toLowerCase()));
  const quotedAuthors =
    quotedAuthorPubkeys.length > 0
      ? await fetchProfilesByPubkey(quotedAuthorPubkeys, "shortTtl").catch(
          () => ({}) as Record<string, Profile>
        )
      : {};

  const resolution: NoteContentResolution = {
    profilesByPubkey: {
      ...contentResolution.profilesByPubkey,
      ...authorsByPubkey,
      ...quotedAuthors,
    },
    eventsById: contentResolution.eventsById,
  };

  return (
    <section aria-label="Comments" className="mt-6">
      <h2 className="text-ink text-sm font-medium">Comments</h2>
      <ol className="divide-edge/60 mt-2 divide-y">
        {comments.map((comment) => {
          const author =
            typeof comment.pubkey === "string"
              ? (authorsByPubkey[comment.pubkey.toLowerCase()] ?? authorsByPubkey[comment.pubkey])
              : undefined;
          const label = commentAuthorLabel(comment, author);
          return (
            <li key={comment.id} className="py-3">
              <article aria-label={`Comment by ${label}`}>
                <EventByline event={comment} author={author} />
                <CommentBody comment={comment} resolution={resolution} />
              </article>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
