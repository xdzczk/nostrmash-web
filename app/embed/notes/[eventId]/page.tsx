import Link from "next/link";
import { notFound } from "next/navigation";

import { NoteCard } from "@/components/explorer/note-card";
import { applyEngagementStats, isRecord } from "@/components/explorer/utils";
import { getNoteSummaryCached } from "@/lib/notes/load-note-page-data";
import { resolveContentReferences } from "@/lib/notes/resolve-content-refs";
import { isValidEventIdParam, resolveEventIdParam } from "@/lib/routing/params";
import { absoluteUrl } from "@/lib/seo/metadata";
import type { Profile } from "@/lib/types/api";

type Params = Promise<{ eventId: string }>;

export default async function EmbedNotePage({ params }: { params: Params }) {
  const { eventId } = await params;
  if (!isValidEventIdParam(eventId)) notFound();
  const resolvedId = resolveEventIdParam(eventId) ?? eventId;

  let note = null;
  let author: Profile | undefined;
  try {
    const summary = await getNoteSummaryCached(resolvedId);
    const baseNote = summary.note ?? null;
    note = baseNote
      ? applyEngagementStats(
          baseNote,
          isRecord(summary.counts) ? summary.counts : {},
          isRecord(summary.summary) ? summary.summary : {}
        )
      : null;
    author = (summary.author?.profile as Profile | undefined) ?? undefined;
  } catch {
    notFound();
  }
  if (!note) notFound();

  const contentResolution = await resolveContentReferences(
    typeof note.content === "string" ? [note.content] : []
  ).catch(() => undefined);

  return (
    <main className="bg-background text-foreground min-h-screen p-3">
      <NoteCard note={note} author={author} showFullContent contentResolution={contentResolution} />
      <p className="text-ink-faint mt-3 text-center text-xs">
        <Link
          href={absoluteUrl(`/notes/${encodeURIComponent(resolvedId)}`)}
          className="text-link hover:underline"
          target="_blank"
          rel="noopener noreferrer"
        >
          Open on NostrMash
        </Link>
      </p>
    </main>
  );
}
