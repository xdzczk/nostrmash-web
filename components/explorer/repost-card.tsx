import Link from "next/link";

import type { NoteCardDensity } from "@/components/explorer/note-card";
import { NoteCard } from "@/components/explorer/note-card";
import type { NoteContentResolution } from "@/components/explorer/note-content";
import { ProfileAvatar } from "@/components/explorer/profile-avatar";
import { Timestamp } from "@/components/explorer/timestamp";
import {
  lookupProfileByPubkey,
  noteAuthorIdentifier,
  noteInlineAuthorProfile,
  profileHref,
  profileLabel,
  truncateProfileLabel,
} from "@/components/explorer/utils";
import { parseRepostTarget } from "@/lib/notes/repost";
import type { EventRecord, Profile } from "@/lib/types/api";

/**
 * NIP-18 repost (kind 6 / 16): "{author} reposted" header followed by the
 * original note. The raw JSON payload in `content` is never rendered.
 */
export function RepostCard({
  repost,
  author,
  href,
  density = "list",
  contentResolution,
  contextEventId,
}: {
  repost: EventRecord;
  author?: Profile;
  href?: string;
  density?: NoteCardDensity;
  contentResolution?: NoteContentResolution;
  /**
   * The note the surrounding page is about. Reposts of that note collapse to a
   * one-line attribution instead of re-embedding content already on screen.
   */
  contextEventId?: string;
}) {
  const reposter = author ?? noteInlineAuthorProfile(repost);
  const reposterLabel = reposter ? profileLabel(reposter) : noteAuthorIdentifier(repost);
  const reposterHref = profileHref(
    reposter,
    typeof repost.pubkey === "string" ? repost.pubkey : undefined
  );
  const target = parseRepostTarget(repost);
  const original =
    target.embedded ??
    (target.targetId
      ? (contentResolution?.eventsById?.[target.targetId] ??
        contentResolution?.eventsById?.[target.targetId.toLowerCase()])
      : undefined);
  const originalAuthor =
    original && typeof original.pubkey === "string"
      ? lookupProfileByPubkey(original.pubkey, contentResolution?.profilesByPubkey)
      : target.targetPubkey
        ? lookupProfileByPubkey(target.targetPubkey, contentResolution?.profilesByPubkey)
        : undefined;
  const innerDensity: NoteCardDensity = density === "list" ? "list" : "reply";
  const repostsContextNote =
    typeof contextEventId === "string" &&
    contextEventId.length > 0 &&
    (target.targetId?.toLowerCase() === contextEventId.toLowerCase() ||
      original?.id?.toLowerCase() === contextEventId.toLowerCase());
  const surface = repostsContextNote
    ? "border-b border-edge/60 px-1 py-3 last:border-b-0 sm:px-2"
    : density === "list"
      ? "border-b border-edge/65 px-1 py-5 sm:px-2 sm:py-6"
      : "border-b border-edge/60 px-1 py-4 last:border-b-0 sm:px-2";

  return (
    <article className={surface} aria-label={`Repost by ${reposterLabel}`}>
      <div className="text-ink-dim flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[13px]">
        <span aria-hidden className="text-ink-faint">
          ↻
        </span>
        {reposter ? (
          <ProfileAvatar
            profile={reposter}
            size={18}
            alt=""
            className="h-[18px] w-[18px] rounded-full object-cover"
          />
        ) : null}
        {reposterHref ? (
          <Link
            href={reposterHref}
            className="text-ink-soft hover:text-ink-strong inline-flex min-h-6 items-center font-medium hover:underline"
          >
            {truncateProfileLabel(reposterLabel)}
          </Link>
        ) : (
          <span className="text-ink-soft font-medium">{truncateProfileLabel(reposterLabel)}</span>
        )}
        <span>{repostsContextNote ? "reposted this note" : "reposted"}</span>
        <span aria-hidden className="text-ink-faint/70">
          •
        </span>
        <Timestamp unixSeconds={repost.created_at} />
      </div>
      {repostsContextNote ? null : (
        <div className="border-edge/70 mt-2 border-l-2 pl-3 sm:pl-4">
          {original ? (
            <NoteCard
              note={original}
              author={originalAuthor}
              href={href}
              density={innerDensity}
              contentResolution={contentResolution}
            />
          ) : (
            <p className="text-ink-dim py-2 text-sm">
              Reposted a note that isn&apos;t indexed yet.
              {target.targetId ? (
                <>
                  {" "}
                  <Link
                    href={`/notes/${encodeURIComponent(target.targetId)}`}
                    className="text-link hover:text-link-hover inline-flex min-h-6 items-center"
                  >
                    Open the original
                  </Link>
                </>
              ) : null}
            </p>
          )}
        </div>
      )}
    </article>
  );
}
