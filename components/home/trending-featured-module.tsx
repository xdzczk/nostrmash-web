/* eslint-disable @next/next/no-img-element */

import Image from "next/image";
import Link from "next/link";

import { Timestamp } from "@/components/explorer/timestamp";
import {
  extractHashtagsFromNote,
  extractPrimitiveStats,
  extractRelayHostsFromNote,
  formatMetricLabel,
  formatValue,
  noteInlineAuthorProfile,
  noteAuthorIdentifier,
  profileIdentifier,
  profileInitial,
  profileLabel,
  profilePictureUrl,
  profileSecondaryLabel,
  truncateMiddle,
} from "@/components/explorer/utils";
import type { EventRecord, Profile } from "@/lib/types/api";

type MediaKind = "image" | "video" | "audio";

interface MediaAttachment {
  url: string;
  kind: MediaKind;
}

interface DiscoverySignal {
  label: string;
  value: string;
}

const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp", ".avif", ".svg"]);
const VIDEO_EXTENSIONS = new Set([".mp4", ".webm", ".mov", ".m4v"]);
const AUDIO_EXTENSIONS = new Set([".mp3", ".wav", ".ogg", ".m4a", ".aac", ".flac"]);

function getAuthorByPubkey(
  authorsByPubkey: Record<string, Profile> | undefined,
  note: EventRecord
): Profile | undefined {
  const inlineAuthor = noteInlineAuthorProfile(note);
  if (inlineAuthor) return inlineAuthor;
  const pubkey = note.pubkey;
  if (!authorsByPubkey || typeof pubkey !== "string") return undefined;
  const normalized = pubkey.trim().toLowerCase();
  return authorsByPubkey[normalized] ?? authorsByPubkey[pubkey];
}

function resolveNoteId(note: EventRecord): string | undefined {
  const candidateKeys = ["id", "event_id", "eventId"] as const;
  for (const key of candidateKeys) {
    const value = note[key];
    if (typeof value === "string" && value.length > 0) {
      return value;
    }
  }
  return undefined;
}

function normalizeCandidateUrl(value: string): string {
  return value.replace(/[),.;!?]+$/g, "");
}

function extractUrls(text: string): string[] {
  const matches = text.match(/https?:\/\/\S+/g) ?? [];
  const deduped = new Set<string>();

  for (const match of matches) {
    const normalized = normalizeCandidateUrl(match);
    if (normalized.length > 0) {
      deduped.add(normalized);
    }
  }

  return Array.from(deduped);
}

function classifyMediaUrl(value: string): MediaKind | null {
  try {
    const url = new URL(value);
    const pathname = url.pathname.toLowerCase();

    for (const extension of IMAGE_EXTENSIONS) {
      if (pathname.endsWith(extension)) return "image";
    }
    for (const extension of VIDEO_EXTENSIONS) {
      if (pathname.endsWith(extension)) return "video";
    }
    for (const extension of AUDIO_EXTENSIONS) {
      if (pathname.endsWith(extension)) return "audio";
    }
  } catch {
    return null;
  }

  return null;
}

function extractMediaAttachment(note: EventRecord): MediaAttachment | null {
  if (typeof note.content !== "string" || note.content.length === 0) {
    return null;
  }

  return (
    extractUrls(note.content)
      .map((url) => {
        const kind = classifyMediaUrl(url);
        return kind ? { url, kind } : null;
      })
      .filter((entry): entry is MediaAttachment => entry !== null)[0] ?? null
  );
}

function buildDiscoverySignals(note: EventRecord): DiscoverySignal[] {
  const rawMetrics = extractPrimitiveStats(note, [
    "id",
    "pubkey",
    "kind",
    "created_at",
    "content",
    "tags",
  ]).filter((entry) => /(reply|repost|boost|zap|like|reaction)/i.test(entry.label));
  const metricPriority = [/repl(y|ies)/i, /(repost|boost)/i, /zap/i, /(like|reaction)/i];
  const prioritizedMetrics = metricPriority
    .map((matcher) => rawMetrics.find((entry) => matcher.test(entry.label)))
    .filter((entry, index, entries): entry is (typeof rawMetrics)[number] => {
      if (!entry) return false;
      return entries.findIndex((candidate) => candidate?.label === entry.label) === index;
    });

  const signals = prioritizedMetrics.slice(0, 3).map((metric) => ({
    label: formatMetricLabel(metric.label),
    value: truncateMiddle(formatValue(metric.value), 16),
  }));

  const relayHosts = extractRelayHostsFromNote(note, 3);
  if (signals.length < 3 && relayHosts.length > 1) {
    signals.push({
      label: "Relays",
      value: relayHosts.length.toLocaleString(),
    });
  }

  return signals.slice(0, 3);
}

function buildSurfacedReason(note: EventRecord, signals: DiscoverySignal[]): string {
  const signalLabels = signals.map((signal) => signal.label.toLowerCase());
  if (signalLabels.some((label) => label.includes("repl"))) {
    return "Reply volume is climbing.";
  }
  if (signalLabels.some((label) => label.includes("boost") || label.includes("repost"))) {
    return "It is spreading quickly.";
  }
  if (signalLabels.some((label) => label.includes("zap"))) {
    return "Support activity is picking up.";
  }
  if (signalLabels.some((label) => label.includes("like") || label.includes("reaction"))) {
    return "Engagement is building.";
  }

  const relayHosts = extractRelayHostsFromNote(note, 3);
  if (relayHosts.length > 1) {
    return `Seen on ${relayHosts.length.toLocaleString()} relays in this window.`;
  }

  const hashtags = extractHashtagsFromNote(note, 1);
  if (hashtags.length > 0) {
    return `Moving with current ${`#${hashtags[0]}`} activity.`;
  }

  return "It stands out in the current window.";
}

function buildStatusLabel(rank: number, signals: DiscoverySignal[]): string {
  if (rank === 1) return "Leading now";
  if (signals.some((signal) => signal.label.toLowerCase().includes("repl"))) return "Reply lift";
  if (signals.some((signal) => signal.label.toLowerCase().includes("boost"))) return "Shared fast";
  return "In view";
}

function NoteAuthor({ note, author }: { note: EventRecord; author?: Profile }) {
  const authorLabel = author ? profileLabel(author) : noteAuthorIdentifier(note);
  const authorSecondaryLabel = author ? profileSecondaryLabel(author) : null;
  const authorPictureUrl = author ? profilePictureUrl(author) : null;
  const authorIdentifier = author ? profileIdentifier(author) : "";
  const authorHref =
    authorIdentifier && authorIdentifier !== "unknown"
      ? `/profiles/${encodeURIComponent(authorIdentifier)}`
      : undefined;
  const authorInitial = author
    ? profileInitial(author)
    : authorLabel.slice(0, 1).toUpperCase() || "?";

  return (
    <div className="flex items-center gap-3">
      {authorPictureUrl ? (
        <Image
          src={authorPictureUrl}
          alt={authorLabel}
          width={48}
          height={48}
          unoptimized
          className="h-12 w-12 rounded-full border border-white/10 object-cover"
        />
      ) : (
        <div className="flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-zinc-950/60 text-sm font-medium text-zinc-300">
          {authorInitial}
        </div>
      )}
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
          {authorHref ? (
            <Link href={authorHref} className="font-medium text-zinc-50 hover:text-white">
              {authorLabel}
            </Link>
          ) : (
            <span className="font-medium text-zinc-50">{authorLabel}</span>
          )}
          {authorSecondaryLabel ? (
            <span className="truncate text-zinc-500">
              {truncateMiddle(authorSecondaryLabel, 28)}
            </span>
          ) : null}
        </div>
        <Timestamp unixSeconds={note.created_at} className="text-xs" />
      </div>
    </div>
  );
}

function SignalRow({ signals }: { signals: DiscoverySignal[] }) {
  if (signals.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-zinc-300">
      {signals.map((signal) => (
        <span
          key={`${signal.label}-${signal.value}`}
          className="inline-flex items-center gap-1.5 rounded-full border border-white/8 bg-white/[0.03] px-2.5 py-1"
        >
          <span className="text-[11px] tracking-[0.14em] text-zinc-500 uppercase">
            {signal.label}
          </span>
          <span className="font-medium text-zinc-100">{signal.value}</span>
        </span>
      ))}
    </div>
  );
}

function QuietActionLinks({ noteId, noteHref }: { noteId?: string; noteHref?: string }) {
  if (!noteId) return null;

  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-zinc-500">
      {noteHref ? (
        <Link href={noteHref} className="transition hover:text-indigo-200">
          Open note
        </Link>
      ) : null}
      <span className="text-zinc-700">•</span>
      <Link
        href={`/notes/${encodeURIComponent(noteId)}#conversation-context`}
        className="transition hover:text-indigo-200"
      >
        Open thread
      </Link>
      <span className="text-zinc-700">•</span>
      <Link
        href={`/notes/${encodeURIComponent(noteId)}#note-provenance`}
        className="transition hover:text-indigo-200"
      >
        Seen on relays
      </Link>
    </div>
  );
}

function NoteMediaFrame({
  attachment,
  compact = false,
}: {
  attachment: MediaAttachment;
  compact?: boolean;
}) {
  const frameClassName = compact
    ? "aspect-[16/10] rounded-[1.15rem]"
    : "aspect-[16/11] rounded-[1.35rem]";

  return (
    <div className={`overflow-hidden border border-white/10 bg-zinc-950/70 ${frameClassName}`}>
      {attachment.kind === "image" ? (
        <img src={attachment.url} alt="" className="h-full w-full object-cover" />
      ) : null}
      {attachment.kind === "video" ? (
        <video
          src={attachment.url}
          controls
          playsInline
          preload="metadata"
          className="h-full w-full bg-black object-cover"
        />
      ) : null}
      {attachment.kind === "audio" ? (
        <div className="flex h-full items-center justify-center px-4 text-sm text-zinc-300">
          <span>Audio attachment</span>
        </div>
      ) : null}
    </div>
  );
}

function FeaturedNoteCard({
  note,
  author,
  rank,
}: {
  note: EventRecord;
  author?: Profile;
  rank: number;
}) {
  const noteId = resolveNoteId(note);
  const noteHref = noteId ? `/notes/${encodeURIComponent(noteId)}` : undefined;
  const content =
    typeof note.content === "string" && note.content.trim().length > 0
      ? note.content.trim()
      : "Media-only note with no text body.";
  const mediaAttachment = extractMediaAttachment(note);
  const signals = buildDiscoverySignals(note);
  const reason = buildSurfacedReason(note, signals);
  const statusLabel = buildStatusLabel(rank, signals);

  return (
    <article className="rounded-[1.6rem] border border-white/10 bg-[linear-gradient(180deg,rgba(39,39,42,0.94),rgba(24,24,27,0.92))] p-5 shadow-[0_30px_90px_rgba(15,23,42,0.24)] sm:p-6">
      <div className="flex flex-wrap items-center gap-2.5 text-sm">
        <span className="inline-flex items-center rounded-full border border-indigo-400/20 bg-indigo-400/10 px-2.5 py-1 text-[11px] font-medium tracking-[0.18em] text-indigo-200 uppercase">
          Featured note
        </span>
        <span className="text-[11px] font-medium tracking-[0.18em] text-zinc-500 uppercase">
          #{rank}
        </span>
        <span className="text-zinc-600">•</span>
        <span className="text-zinc-400">{statusLabel}</span>
      </div>

      <div
        className={`mt-5 grid gap-5 ${
          mediaAttachment ? "xl:grid-cols-[minmax(0,1fr)_minmax(280px,0.72fr)]" : ""
        }`}
      >
        <div className="min-w-0 space-y-[1.125rem]">
          <NoteAuthor note={note} author={author} />
          <p className="text-base leading-7 [overflow-wrap:anywhere] whitespace-pre-wrap text-zinc-100 sm:text-[1.05rem]">
            {content}
          </p>
          <p className="text-sm leading-6 text-zinc-300">
            <span className="text-[11px] font-medium tracking-[0.18em] text-zinc-500 uppercase">
              Why now
            </span>
            <span className="mx-2 text-zinc-600">•</span>
            {reason}
          </p>
          <SignalRow signals={signals} />
          <QuietActionLinks noteId={noteId} noteHref={noteHref} />
        </div>

        {mediaAttachment ? <NoteMediaFrame attachment={mediaAttachment} /> : null}
      </div>
    </article>
  );
}

function SecondaryNoteCard({
  note,
  author,
  rank,
}: {
  note: EventRecord;
  author?: Profile;
  rank: number;
}) {
  const noteId = resolveNoteId(note);
  const noteHref = noteId ? `/notes/${encodeURIComponent(noteId)}` : undefined;
  const content =
    typeof note.content === "string" && note.content.trim().length > 0
      ? note.content.trim()
      : "Media-only note with no text body.";
  const mediaAttachment = extractMediaAttachment(note);
  const signals = buildDiscoverySignals(note).slice(0, 2);
  const reason = buildSurfacedReason(note, signals);
  const statusLabel = buildStatusLabel(rank, signals);

  return (
    <article className="rounded-[1.35rem] border border-white/8 bg-zinc-950/28 p-4">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="font-medium tracking-[0.16em] text-zinc-300 uppercase">#{rank}</span>
        <span className="text-zinc-600">•</span>
        <span className="text-zinc-500">{statusLabel}</span>
      </div>

      <div className="mt-3 space-y-3">
        {mediaAttachment ? <NoteMediaFrame attachment={mediaAttachment} compact /> : null}
        <NoteAuthor note={note} author={author} />
        <p className="line-clamp-5 text-sm leading-6 [overflow-wrap:anywhere] whitespace-pre-wrap text-zinc-200">
          {content}
        </p>
        <p className="text-sm leading-6 text-zinc-400">{reason}</p>
        <SignalRow signals={signals} />
        <QuietActionLinks noteId={noteId} noteHref={noteHref} />
      </div>
    </article>
  );
}

export function TrendingFeaturedModule({
  notes,
  authorsByPubkey,
}: {
  notes: EventRecord[];
  authorsByPubkey?: Record<string, Profile>;
}) {
  const curatedNotes = notes.slice(0, 3);
  const [featuredNote, ...secondaryNotes] = curatedNotes;

  if (!featuredNote) return null;

  if (secondaryNotes.length === 0) {
    return (
      <FeaturedNoteCard
        note={featuredNote}
        author={getAuthorByPubkey(authorsByPubkey, featuredNote)}
        rank={1}
      />
    );
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.42fr)_minmax(280px,0.9fr)] xl:items-start">
      <FeaturedNoteCard
        note={featuredNote}
        author={getAuthorByPubkey(authorsByPubkey, featuredNote)}
        rank={1}
      />

      <div className="grid gap-4">
        {secondaryNotes.map((note, index) => (
          <SecondaryNoteCard
            key={resolveNoteId(note) ?? `trending-secondary-${index}`}
            note={note}
            author={getAuthorByPubkey(authorsByPubkey, note)}
            rank={index + 2}
          />
        ))}
      </div>
    </div>
  );
}
