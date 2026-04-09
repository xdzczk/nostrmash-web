import Link from "next/link";

import { IdBadge } from "@/components/explorer/id-badge";
import { Timestamp } from "@/components/explorer/timestamp";
import {
  extractPrimitiveStats,
  noteAuthorIdentifier,
  truncateMiddle,
} from "@/components/explorer/utils";
import type { EventRecord } from "@/lib/types/api";

export function NoteCard({
  note,
  href,
  rank,
  showFullContent = false,
}: {
  note: EventRecord;
  href?: string;
  rank?: number;
  showFullContent?: boolean;
}) {
  const noteHref = href ?? (note.id ? `/notes/${encodeURIComponent(note.id)}` : undefined);
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
      <div className="flex flex-wrap items-center gap-2 text-xs">
        {typeof rank === "number" ? (
          <span className="rounded-full border border-indigo-500/40 bg-indigo-500/10 px-2 py-1 text-indigo-300">
            #{rank}
          </span>
        ) : null}
        <span className="text-zinc-400">{noteAuthorIdentifier(note)}</span>
        <span className="text-zinc-600">•</span>
        <Timestamp unixSeconds={note.created_at} />
        {typeof note.kind === "number" ? (
          <span className="rounded-full border border-zinc-700 px-2 py-1 text-zinc-300">
            kind {note.kind}
          </span>
        ) : null}
      </div>

      <p
        className={`mt-3 text-sm text-zinc-100 ${showFullContent ? "whitespace-pre-wrap" : "line-clamp-4"}`}
      >
        {typeof note.content === "string" && note.content.length > 0
          ? note.content
          : "(no content)"}
      </p>

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
