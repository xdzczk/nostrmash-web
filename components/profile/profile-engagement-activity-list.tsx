import Link from "next/link";
import type { ReactNode } from "react";

import type { NoteContentResolution } from "@/components/explorer/note-content";
import { activitySnippet } from "@/components/explorer/note-preview";
import { Timestamp } from "@/components/explorer/timestamp";
import { profileLabel } from "@/components/explorer/utils";
import { presentReactionContent } from "@/lib/profile/reaction-display";
import type { AuthorReactionRecord, AuthorZapRecord, EventRecord, Profile } from "@/lib/types/api";

function resolveTargetNote(
  entry: { target_event?: EventRecord; target_note?: EventRecord; target_event_id?: string },
  targetNotesById: Record<string, EventRecord>
): EventRecord | null {
  const embedded = entry.target_event ?? entry.target_note;
  if (embedded && typeof embedded.id === "string" && embedded.id.length > 0) {
    return embedded;
  }
  const targetEventId = entry.target_event_id;
  if (typeof targetEventId !== "string" || targetEventId.length === 0) return null;
  return targetNotesById[targetEventId.toLowerCase()] ?? null;
}

function targetAuthorLabel(
  note: EventRecord | null,
  authorsByPubkey?: Record<string, Profile>
): string | null {
  if (!note || typeof note.pubkey !== "string" || note.pubkey.length === 0) return null;
  const author = authorsByPubkey?.[note.pubkey.toLowerCase()] ?? authorsByPubkey?.[note.pubkey];
  if (author) return profileLabel(author);
  return null;
}

function targetHref(note: EventRecord | null, fallbackId?: string): string | null {
  const id =
    (note && typeof note.id === "string" && note.id.length > 0 ? note.id : undefined) ?? fallbackId;
  return id ? `/notes/${encodeURIComponent(id)}` : null;
}

function formatZapAmount(zap: AuthorZapRecord): string | null {
  if (typeof zap.sats === "number" && zap.sats > 0) {
    return `${zap.sats.toLocaleString()} sats`;
  }
  const msats = zap.msats ?? zap.amount_msats;
  if (typeof msats === "number" && msats > 0) {
    if (msats >= 1000) {
      const sats = msats / 1000;
      return Number.isInteger(sats)
        ? `${sats.toLocaleString()} sats`
        : `${sats.toLocaleString(undefined, { maximumFractionDigits: 1 })} sats`;
    }
    return `${msats.toLocaleString()} msats`;
  }
  return null;
}

function reactionTags(reaction: AuthorReactionRecord): unknown {
  if (Array.isArray(reaction.tags)) return reaction.tags;
  const event = reaction.event;
  if (event && Array.isArray(event.tags)) return event.tags;
  return undefined;
}

function reactionContent(reaction: AuthorReactionRecord): string | undefined {
  if (typeof reaction.reaction === "string" && reaction.reaction.trim().length > 0) {
    return reaction.reaction;
  }
  if (typeof reaction.content === "string" && reaction.content.trim().length > 0) {
    return reaction.content;
  }
  const eventContent = reaction.event?.content;
  if (typeof eventContent === "string" && eventContent.trim().length > 0) return eventContent;
  if (typeof reaction.reaction_type === "string" && reaction.reaction_type.trim().length > 0) {
    return reaction.reaction_type;
  }
  return undefined;
}

function EngagementRow({
  marker,
  note,
  fallbackId,
  authorsByPubkey,
  createdAt,
  resolution,
}: {
  marker: ReactNode;
  note: EventRecord | null;
  fallbackId?: string;
  authorsByPubkey?: Record<string, Profile>;
  createdAt?: number;
  resolution?: NoteContentResolution;
}) {
  const author = targetAuthorLabel(note, authorsByPubkey);
  const line = note ? activitySnippet(note, resolution) : "";
  const href = targetHref(note, fallbackId);
  const body = (
    <span className="flex min-w-0 items-start gap-3">
      <span className="flex shrink-0 items-center justify-center text-lg leading-none">
        {marker}
      </span>
      <span className="min-w-0 flex-1">
        <span className="text-ink block truncate text-sm">
          {author ? <span className="font-medium">{author}</span> : null}
          {author && line ? <span className="text-ink-faint"> · </span> : null}
          {line ? <span className="text-ink-dim">{line}</span> : null}
          {!author && !line ? <span className="text-ink-muted">Note</span> : null}
        </span>
        <Timestamp unixSeconds={createdAt} />
      </span>
    </span>
  );
  return href ? (
    <Link href={href} className="hover:bg-surface/40 block rounded-lg px-1 py-2.5">
      {body}
    </Link>
  ) : (
    <div className="px-1 py-2.5">{body}</div>
  );
}

export function ProfileReactionsActivityList({
  reactions,
  targetNotesById,
  authorsByPubkey,
  resolution,
}: {
  reactions: AuthorReactionRecord[];
  targetNotesById: Record<string, EventRecord>;
  authorsByPubkey?: Record<string, Profile>;
  resolution?: NoteContentResolution;
}) {
  return (
    <ul className="divide-edge/60 divide-y">
      {reactions.map((reaction, index) => {
        const targetNote = resolveTargetNote(reaction, targetNotesById);
        const display = presentReactionContent(reactionContent(reaction), reactionTags(reaction));
        const reactionKey =
          reaction.event_id ??
          `${reaction.target_event_id ?? "reaction"}-${reaction.created_at ?? index}`;
        return (
          <li key={reactionKey}>
            <EngagementRow
              marker={
                display.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={display.imageUrl}
                    alt={display.text}
                    className="h-5 w-5 object-contain"
                  />
                ) : (
                  <span aria-label={display.text}>{display.text}</span>
                )
              }
              note={targetNote}
              fallbackId={reaction.target_event_id}
              authorsByPubkey={authorsByPubkey}
              createdAt={reaction.created_at}
              resolution={resolution}
            />
          </li>
        );
      })}
    </ul>
  );
}

export function ProfileZapsActivityList({
  zaps,
  targetNotesById,
  authorsByPubkey,
  resolution,
}: {
  zaps: AuthorZapRecord[];
  targetNotesById: Record<string, EventRecord>;
  authorsByPubkey?: Record<string, Profile>;
  resolution?: NoteContentResolution;
}) {
  return (
    <ul className="divide-edge/60 divide-y">
      {zaps.map((zap, index) => {
        const targetNote = resolveTargetNote(zap, targetNotesById);
        const amountLabel = formatZapAmount(zap);
        const zapKey = zap.event_id ?? `${zap.target_event_id ?? "zap"}-${zap.created_at ?? index}`;
        return (
          <li key={zapKey}>
            <EngagementRow
              marker={
                <span className="text-ink text-sm font-medium tabular-nums">
                  {amountLabel ?? "Zap"}
                </span>
              }
              note={targetNote}
              fallbackId={zap.target_event_id}
              authorsByPubkey={authorsByPubkey}
              createdAt={zap.created_at}
              resolution={resolution}
            />
          </li>
        );
      })}
    </ul>
  );
}
