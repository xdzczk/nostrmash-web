import Link from "next/link";

import { NoteCard } from "@/components/explorer/note-card";
import { Timestamp } from "@/components/explorer/timestamp";
import { cardTierClassName } from "@/components/explorer/card-grammar";
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

export function ProfileReactionsActivityList({
  reactions,
  targetNotesById,
  authorsByPubkey,
}: {
  reactions: AuthorReactionRecord[];
  targetNotesById: Record<string, EventRecord>;
  authorsByPubkey?: Record<string, Profile>;
}) {
  return (
    <ul className="space-y-3">
      {reactions.map((reaction, index) => {
        const targetNote = resolveTargetNote(reaction, targetNotesById);
        const reactionLabel =
          (typeof reaction.reaction === "string" && reaction.reaction.trim().length > 0
            ? reaction.reaction.trim()
            : typeof reaction.reaction_type === "string" && reaction.reaction_type.trim().length > 0
              ? reaction.reaction_type.trim()
              : "+") ?? "+";
        const reactionKey =
          reaction.event_id ??
          `${reaction.target_event_id ?? "reaction"}-${reaction.created_at ?? index}`;

        return (
          <li key={reactionKey} className={`${cardTierClassName("standard")} space-y-3 p-4`}>
            <div className="text-ink-muted flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-amber-100">
                Reaction: {reactionLabel}
              </span>
              <Timestamp unixSeconds={reaction.created_at} />
            </div>
            {targetNote ? (
              <div className="space-y-2">
                <p className="text-ink-faint text-xs font-medium">On note</p>
                <NoteCard
                  note={targetNote}
                  author={
                    targetNote.pubkey
                      ? authorsByPubkey?.[targetNote.pubkey.toLowerCase()]
                      : undefined
                  }
                />
              </div>
            ) : reaction.target_event_id ? (
              <Link
                href={`/notes/${encodeURIComponent(reaction.target_event_id)}`}
                className="text-link hover:text-link-hover text-sm"
              >
                Open target note
              </Link>
            ) : (
              <p className="text-ink-faint text-sm">Target note unavailable.</p>
            )}
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
}: {
  zaps: AuthorZapRecord[];
  targetNotesById: Record<string, EventRecord>;
  authorsByPubkey?: Record<string, Profile>;
}) {
  return (
    <ul className="space-y-3">
      {zaps.map((zap, index) => {
        const targetNote = resolveTargetNote(zap, targetNotesById);
        const amountLabel = formatZapAmount(zap);
        const zapText =
          typeof zap.zap_text === "string" && zap.zap_text.trim().length > 0
            ? zap.zap_text.trim()
            : null;
        const zapKey = zap.event_id ?? `${zap.target_event_id ?? "zap"}-${zap.created_at ?? index}`;

        return (
          <li key={zapKey} className={`${cardTierClassName("standard")} space-y-3 p-4`}>
            <div className="text-ink-muted flex flex-wrap items-center gap-2 text-xs">
              {amountLabel ? (
                <span className="rounded-full border border-yellow-500/30 bg-yellow-500/10 px-2.5 py-1 text-yellow-100">
                  {amountLabel}
                </span>
              ) : (
                <span className="rounded-full border border-yellow-500/30 bg-yellow-500/10 px-2.5 py-1 text-yellow-100">
                  Zap
                </span>
              )}
              {zapText ? (
                <span className="text-ink-soft text-sm">&ldquo;{zapText}&rdquo;</span>
              ) : null}
              <Timestamp unixSeconds={zap.created_at} />
            </div>
            {targetNote ? (
              <div className="space-y-2">
                <p className="text-ink-faint text-xs font-medium">On note</p>
                <NoteCard
                  note={targetNote}
                  author={
                    targetNote.pubkey
                      ? authorsByPubkey?.[targetNote.pubkey.toLowerCase()]
                      : undefined
                  }
                />
              </div>
            ) : zap.target_event_id ? (
              <Link
                href={`/notes/${encodeURIComponent(zap.target_event_id)}`}
                className="text-link hover:text-link-hover text-sm"
              >
                Open target note
              </Link>
            ) : (
              <p className="text-ink-faint text-sm">Target note unavailable.</p>
            )}
          </li>
        );
      })}
    </ul>
  );
}
