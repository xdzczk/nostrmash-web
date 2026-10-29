import { EventByline } from "@/components/explorer/event-byline";
import { profileLabel, truncateIdentifier } from "@/components/explorer/utils";
import { getEventComments } from "@/lib/api/endpoints";
import { extractEventAuthorPubkeys, fetchProfilesByPubkey } from "@/lib/api/profile-hydration";
import type { EventRecord, Profile } from "@/lib/types/api";

function commentAuthorLabel(comment: EventRecord, author?: Profile): string {
  if (author) return profileLabel(author);
  if (typeof comment.pubkey === "string" && comment.pubkey.length > 0) {
    return truncateIdentifier(comment.pubkey, "pubkey", "secondary");
  }
  return "Unknown author";
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

  let authorsByPubkey: Record<string, Profile> = {};
  try {
    authorsByPubkey = await fetchProfilesByPubkey(extractEventAuthorPubkeys(comments), "shortTtl");
  } catch {
    authorsByPubkey = {};
  }

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
          const body = typeof comment.content === "string" ? comment.content.trim() : "";
          return (
            <li key={comment.id} className="py-3">
              <article aria-label={`Comment by ${label}`}>
                <EventByline event={comment} author={author} />
                {body.length > 0 ? (
                  <p className="text-ink mt-2 text-sm leading-6 whitespace-pre-wrap">{body}</p>
                ) : null}
              </article>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
