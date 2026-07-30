/* eslint-disable @next/next/no-img-element */

import Link from "next/link";

import { DiscoveryActionLinks, DiscoveryStatPills } from "@/components/explorer/card-grammar";
import { getNotePreviewPresentation } from "@/components/explorer/note-preview";
import { ProfileAvatar } from "@/components/explorer/profile-avatar";
import { Timestamp } from "@/components/explorer/timestamp";
import { mapNoteWhyNow, WhyNow } from "@/components/explorer/why-now";
import {
  extractPrimitiveStats,
  extractRelayHostsFromNote,
  formatMetricLabel,
  formatValue,
  noteInlineAuthorProfile,
  noteAuthorIdentifier,
  profileIdentifier,
  profileInitial,
  profileLabel,
  profileSecondaryLabel,
  truncateIdentifier,
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

function buildStatusLabel(rank: number, signals: DiscoverySignal[]): string {
  if (rank === 1) return "Leading now";
  if (signals.some((signal) => signal.label.toLowerCase().includes("repl"))) return "Reply lift";
  if (signals.some((signal) => signal.label.toLowerCase().includes("boost"))) return "Shared fast";
  return "In view";
}

function NoteAuthor({
  note,
  author,
  compact = false,
  showSecondaryLabel = true,
}: {
  note: EventRecord;
  author?: Profile;
  compact?: boolean;
  showSecondaryLabel?: boolean;
}) {
  const authorLabel = author ? profileLabel(author) : noteAuthorIdentifier(note);
  const authorSecondaryLabel = author ? profileSecondaryLabel(author) : null;
  const authorAvatarProfile =
    author ??
    (typeof note.pubkey === "string" && note.pubkey.length > 0 ? { pubkey: note.pubkey } : null);
  const authorIdentifier = author ? profileIdentifier(author) : "";
  const authorHref =
    authorIdentifier && authorIdentifier !== "unknown"
      ? `/profiles/${encodeURIComponent(authorIdentifier)}`
      : undefined;
  const authorInitial = author
    ? profileInitial(author)
    : authorLabel.slice(0, 1).toUpperCase() || "?";

  return (
    <div className={compact ? "flex items-center gap-2.5" : "flex items-center gap-3.5"}>
      {authorAvatarProfile ? (
        <ProfileAvatar
          profile={authorAvatarProfile}
          size={compact ? 40 : 48}
          alt={authorLabel}
          className={
            compact
              ? "border-edge-strong/50 h-10 w-10 rounded-full border object-cover"
              : "border-edge-strong/50 h-12 w-12 rounded-full border object-cover"
          }
        />
      ) : (
        <div
          className={
            compact
              ? "bg-surface-sunken/60 text-ink-dim border-edge-strong/50 flex h-10 w-10 items-center justify-center rounded-full border text-xs font-medium"
              : "bg-surface-sunken/60 text-ink-dim border-edge-strong/50 flex h-12 w-12 items-center justify-center rounded-full border text-sm font-medium"
          }
        >
          {authorInitial}
        </div>
      )}
      <div className="min-w-0">
        <div
          className={
            compact
              ? "flex flex-wrap items-center gap-x-2 gap-y-1 text-xs"
              : "flex flex-wrap items-center gap-x-2 gap-y-1 text-sm"
          }
        >
          {authorHref ? (
            <Link
              href={authorHref}
              className={
                compact
                  ? "text-ink-soft hover:text-ink font-medium"
                  : "text-ink-strong hover:text-ink-strong font-medium"
              }
            >
              {authorLabel}
            </Link>
          ) : (
            <span className={compact ? "text-ink-soft font-medium" : "text-ink-strong font-medium"}>
              {authorLabel}
            </span>
          )}
          {showSecondaryLabel && authorSecondaryLabel ? (
            <span className="text-ink-faint truncate" title={authorSecondaryLabel}>
              {truncateIdentifier(authorSecondaryLabel, "npub", "secondary")}
            </span>
          ) : null}
        </div>
        <Timestamp unixSeconds={note.created_at} className={compact ? "text-[11px]" : "text-xs"} />
      </div>
    </div>
  );
}

function SignalRow({
  signals,
  compact = false,
}: {
  signals: DiscoverySignal[];
  compact?: boolean;
}) {
  if (signals.length === 0) return null;

  const stats = signals.map((signal) => ({ label: signal.label, value: signal.value }));
  return <DiscoveryStatPills stats={stats} compact={compact} />;
}

function QuietActionLinks({
  noteId,
  noteHref,
  featured = false,
}: {
  noteId?: string;
  noteHref?: string;
  featured?: boolean;
}) {
  if (!noteId) return null;

  return (
    <div
      className={
        featured
          ? "text-ink-muted flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-xs"
          : "text-ink-faint flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px]"
      }
    >
      {!featured ? (
        <>
          <span className="text-ink-faint">
            event {truncateIdentifier(noteId, "event", "secondary")}
          </span>
          <span className="text-edge-strong">|</span>
        </>
      ) : null}
      <DiscoveryActionLinks
        actions={[
          { label: "Open note", href: noteHref },
          {
            label: "Inspect thread",
            href: `/notes/${encodeURIComponent(noteId)}#conversation-context`,
          },
          {
            label: "Seen on relays",
            href: `/notes/${encodeURIComponent(noteId)}#note-provenance`,
          },
        ]}
        className={featured ? "text-ink-dim" : "text-ink-muted"}
      />
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
    <div
      className={`overflow-hidden ${compact ? "bg-surface-sunken/50 border-edge-strong/50 border" : "bg-surface-sunken/70 border-edge-strong/50 border"} ${frameClassName}`}
    >
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
        <div className="text-ink-dim flex h-full items-center justify-center px-4 text-sm">
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
  const preview = getNotePreviewPresentation(note);
  const content = preview.contentForCard;
  const showContent = content.length > 0 && content !== "(no content)";
  const mediaAttachment = extractMediaAttachment(note);
  const signals = buildDiscoverySignals(note);
  const reasons = mapNoteWhyNow(note);
  const statusLabel = buildStatusLabel(rank, signals);

  return (
    <article className="border-link/20 nm-panel-featured rounded-[1.7rem] border p-6 ring-1 ring-white/10 sm:p-7 xl:p-8">
      <div className="flex flex-wrap items-center gap-2.5 text-sm">
        <span className="bg-accent-soft/15 border-link/30 text-accent-ink inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold tracking-[0.18em] uppercase">
          Lead note
        </span>
        <span className="text-link-hover font-medium tracking-[0.16em] uppercase">#{rank}</span>
        <span aria-hidden className="text-ink-faint/70">
          •
        </span>
        <span className="text-ink-dim">{statusLabel}</span>
      </div>

      <div
        className={`mt-6 grid gap-6 ${
          mediaAttachment ? "2xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.82fr)]" : ""
        }`}
      >
        <div className="max-w-[52rem] min-w-0 space-y-5">
          <NoteAuthor note={note} author={author} showSecondaryLabel={false} />
          {showContent ? (
            <p className="text-ink max-w-[46rem] text-base leading-7 [overflow-wrap:anywhere] whitespace-pre-wrap sm:text-[1.07rem]">
              {content}
            </p>
          ) : null}
          <WhyNow reasons={reasons} tone="highlight" className="max-w-3xl" />
          <SignalRow signals={signals} />
          <div className="border-edge/55 border-t pt-3">
            <QuietActionLinks noteId={noteId} noteHref={noteHref} featured />
          </div>
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
  const preview = getNotePreviewPresentation(note);
  const content = preview.contentForCard;
  const showContent = content.length > 0 && content !== "(no content)";
  const mediaAttachment = extractMediaAttachment(note);
  const signals = buildDiscoverySignals(note).slice(0, 2);
  const reasons = mapNoteWhyNow(note);
  const statusLabel = buildStatusLabel(rank, signals);

  return (
    <article className="bg-surface-sunken/30 rounded-[1.35rem] p-4 xl:p-[1.125rem]">
      <div className="flex flex-wrap items-center gap-2 text-[11px]">
        <span className="text-ink-muted font-medium tracking-[0.16em] uppercase">#{rank}</span>
        <span aria-hidden className="text-ink-faint/70">
          •
        </span>
        <span className="text-ink-faint">{statusLabel}</span>
      </div>

      <div className="mt-2.5 space-y-2.5">
        {mediaAttachment ? <NoteMediaFrame attachment={mediaAttachment} compact /> : null}
        <NoteAuthor note={note} author={author} compact />
        {showContent ? (
          <p
            className={`${preview.isCompact ? "line-clamp-2" : "line-clamp-4"} text-ink-dim text-sm leading-6 [overflow-wrap:anywhere] whitespace-pre-wrap`}
          >
            {content}
          </p>
        ) : null}
        <WhyNow reasons={reasons} maxReasons={1} />
        <SignalRow signals={signals} compact />
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
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1.7fr)_minmax(290px,0.72fr)] lg:items-start lg:gap-6 2xl:grid-cols-[minmax(0,1.82fr)_minmax(310px,0.68fr)]">
      <FeaturedNoteCard
        note={featuredNote}
        author={getAuthorByPubkey(authorsByPubkey, featuredNote)}
        rank={1}
      />

      <div className="grid gap-3.5 lg:gap-4">
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
