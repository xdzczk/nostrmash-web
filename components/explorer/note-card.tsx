import Image from "next/image";
import Link from "next/link";

import { IdBadge } from "@/components/explorer/id-badge";
import { NoteMedia } from "@/components/explorer/note-media";
import { Timestamp } from "@/components/explorer/timestamp";
import {
  extractPrimitiveStats,
  noteAuthorIdentifier,
  profileIdentifier,
  profileInitial,
  profileLabel,
  profileSecondaryLabel,
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
  const noteHref = href ?? (note.id ? `/notes/${encodeURIComponent(note.id)}` : undefined);
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
    .slice(0, 4);

  return (
    <article className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
      <div className="flex items-start gap-3">
        {author?.picture ? (
          <Image
            src={author.picture}
            alt={authorLabel}
            width={44}
            height={44}
            unoptimized
            className="h-11 w-11 rounded-full border border-zinc-700 object-cover"
          />
        ) : (
          <div className="flex h-11 w-11 items-center justify-center rounded-full border border-zinc-700 bg-zinc-900 text-xs text-zinc-500">
            {author ? profileInitial(author) : "?"}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {typeof rank === "number" ? (
              <span className="rounded-full border border-indigo-500/40 bg-indigo-500/10 px-2 py-1 text-indigo-300">
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
        className={`mt-3 text-sm text-zinc-100 ${showFullContent ? "whitespace-pre-wrap" : "line-clamp-4"}`}
      >
        {content}
      </p>

      {typeof note.content === "string" && note.content.length > 0 ? (
        <NoteMedia content={note.content} />
      ) : null}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {note.id ? <IdBadge id={note.id} label="event" /> : null}
        {metrics.map((metric) => (
          <span
            key={metric.label}
            className="rounded-full border border-zinc-700 bg-zinc-900/80 px-2 py-1 text-[11px] text-zinc-300"
          >
            {metric.label}: {truncateMiddle(String(metric.value), 18)}
          </span>
        ))}
      </div>

      {noteHref ? (
        <Link
          href={noteHref}
          className="mt-3 inline-block text-xs text-indigo-300 hover:text-indigo-200"
        >
          Open note
        </Link>
      ) : null}
    </article>
  );
}
