import Image from "next/image";
import Link from "next/link";

import { IdBadge } from "@/components/explorer/id-badge";
import { NoteMedia } from "@/components/explorer/note-media";
import { Timestamp } from "@/components/explorer/timestamp";
import {
  extractPrimitiveStats,
  formatMetricLabel,
  noteAuthorIdentifier,
  profileIdentifier,
  profileInitial,
  profileLabel,
  profileSecondaryLabel,
  extractDomainsFromNote,
  extractHashtagsFromNote,
  extractRelayHostsFromNote,
  truncateMiddle,
} from "@/components/explorer/utils";
import type { EventRecord, Profile } from "@/lib/types/api";

export function NoteCard({
  note,
  author,
  href,
  rank,
  showFullContent = false,
}: {
  note: EventRecord;
  author?: Profile;
  href?: string;
  rank?: number;
  showFullContent?: boolean;
}) {
  const resolvedNoteId =
    (typeof note.id === "string" && note.id.length > 0
      ? note.id
      : typeof note.event_id === "string" && note.event_id.length > 0
        ? note.event_id
        : typeof note.eventId === "string" && note.eventId.length > 0
          ? note.eventId
          : undefined) ?? undefined;
  const noteHref =
    href ?? (resolvedNoteId ? `/notes/${encodeURIComponent(resolvedNoteId)}` : undefined);
  const authorLabel = author ? profileLabel(author) : noteAuthorIdentifier(note);
  const authorSecondaryLabel = author ? profileSecondaryLabel(author) : noteAuthorIdentifier(note);
  const authorHref =
    author && profileIdentifier(author) !== "unknown"
      ? `/profiles/${encodeURIComponent(profileIdentifier(author))}`
      : undefined;
  const content =
    typeof note.content === "string" && note.content.length > 0 ? note.content : "(no content)";
  const metrics = extractPrimitiveStats(note, [
    "id",
    "pubkey",
    "kind",
    "created_at",
    "content",
    "tags",
  ])
    .filter((entry) => /(count|score|rank|likes|replies|zaps|boosts)/i.test(entry.label))
    .slice(0, 3);
  const isTopRank = typeof rank === "number" && rank <= 3;
  const noteDomains = extractDomainsFromNote(note, 4);
  const noteHashtags = extractHashtagsFromNote(note, 4);
  const relayHosts = extractRelayHostsFromNote(note, 3);

  return (
    <article
      className={`rounded-xl border p-3 sm:p-4 ${
        isTopRank ? "border-zinc-700 bg-zinc-900/65" : "border-zinc-800 bg-zinc-900/50"
      }`}
    >
      <div className="flex items-start gap-3">
        {author?.picture ? (
          <Image
            src={author.picture}
            alt={authorLabel}
            width={44}
            height={44}
            unoptimized
            className="h-10 w-10 rounded-full border border-zinc-700 object-cover sm:h-11 sm:w-11"
          />
        ) : (
          <div className="flex h-10 w-10 items-center justify-center rounded-full border border-zinc-700 bg-zinc-900 text-xs text-zinc-500 sm:h-11 sm:w-11">
            {author ? profileInitial(author) : "?"}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {typeof rank === "number" ? (
              <span
                className={`rounded-full px-2 py-1 ${
                  isTopRank
                    ? "border border-indigo-500/40 bg-indigo-500/10 text-indigo-300"
                    : "border border-zinc-700 text-zinc-400"
                }`}
              >
                #{rank}
              </span>
            ) : null}
            {authorHref ? (
              <Link href={authorHref} className="font-medium text-zinc-200 hover:text-white">
                {authorLabel}
              </Link>
            ) : (
              <span className="font-medium text-zinc-200">{authorLabel}</span>
            )}
            {authorSecondaryLabel ? (
              <span className="text-zinc-500">{truncateMiddle(authorSecondaryLabel, 28)}</span>
            ) : null}
            <span className="text-zinc-600">•</span>
            <Timestamp unixSeconds={note.created_at} />
            {typeof note.kind === "number" ? (
              <span className="rounded-full border border-zinc-700 px-2 py-1 text-zinc-300">
                kind {note.kind}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      <p
        className={`mt-2.5 text-sm leading-5 text-zinc-100 sm:mt-3 sm:leading-6 ${
          showFullContent ? "whitespace-pre-wrap" : "line-clamp-4"
        }`}
      >
        {content}
      </p>

      {typeof note.content === "string" && note.content.length > 0 ? (
        <NoteMedia content={note.content} />
      ) : null}

      {noteDomains.length > 0 ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {noteDomains.map((domain) => (
            <Link
              key={domain}
              href={`/domains/${encodeURIComponent(domain)}`}
              className="rounded-full border border-zinc-700 px-2.5 py-1 text-xs text-zinc-300 hover:text-zinc-100"
            >
              {domain}
            </Link>
          ))}
        </div>
      ) : null}

      {noteHashtags.length > 0 ? (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {noteHashtags.map((hashtag) => (
            <Link
              key={hashtag}
              href={`/hashtags/${encodeURIComponent(hashtag)}`}
              className="rounded-full border border-zinc-700 px-2.5 py-1 text-xs text-zinc-300 hover:text-zinc-100"
            >
              #{hashtag}
            </Link>
          ))}
        </div>
      ) : null}

      {relayHosts.length > 0 ? (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {relayHosts.map((relayHost) => (
            <Link
              key={relayHost}
              href={`/relays/${encodeURIComponent(relayHost)}`}
              className="rounded-full border border-zinc-700 px-2.5 py-1 text-xs text-indigo-300 hover:border-indigo-400/40"
            >
              relay: {relayHost}
            </Link>
          ))}
        </div>
      ) : null}

      <div className="mt-2.5 grid gap-2 text-xs text-zinc-300 sm:mt-3 sm:grid-cols-3">
        {metrics.map((metric) => (
          <div
            key={metric.label}
            className="rounded-md border border-zinc-800/90 bg-zinc-950/20 px-2 py-1.5"
          >
            <p className="text-[11px] tracking-wide text-zinc-500 uppercase">
              {formatMetricLabel(metric.label)}
            </p>
            <p className="mt-0.5 text-sm text-zinc-200">
              {truncateMiddle(String(metric.value), 18)}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-2 sm:mt-3">
        {resolvedNoteId ? <IdBadge id={resolvedNoteId} label="event" /> : null}
      </div>

      {resolvedNoteId ? (
        <div className="mt-2.5 flex flex-wrap items-center gap-2 text-xs sm:mt-3">
          {noteHref ? (
            <Link href={noteHref} className="text-indigo-300 hover:text-indigo-200">
              Open note
            </Link>
          ) : null}
          <span className="text-zinc-600">•</span>
          <Link
            href={`/notes/${encodeURIComponent(resolvedNoteId)}#conversation-context`}
            className="text-indigo-300 hover:text-indigo-200"
          >
            View thread
          </Link>
          <span className="text-zinc-600">•</span>
          <Link
            href={`/notes/${encodeURIComponent(resolvedNoteId)}#related-notes`}
            className="text-indigo-300 hover:text-indigo-200"
          >
            Related notes
          </Link>
          <span className="text-zinc-600">•</span>
          <Link
            href={`/notes/${encodeURIComponent(resolvedNoteId)}#note-provenance`}
            className="text-indigo-300 hover:text-indigo-200"
          >
            Seen-on relays
          </Link>
        </div>
      ) : null}
    </article>
  );
}
