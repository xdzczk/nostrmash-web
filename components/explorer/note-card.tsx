import Image from "next/image";
import Link from "next/link";

import { NoteMedia } from "@/components/explorer/note-media";
import { getNotePreviewPresentation } from "@/components/explorer/note-preview";
import { Timestamp } from "@/components/explorer/timestamp";
import {
  cardTierClassName,
  DiscoveryActionLinks,
  DiscoveryPill,
  DiscoveryStatPills,
} from "@/components/explorer/card-grammar";
import { mapNoteWhyNow, WhyNow } from "@/components/explorer/why-now";
import {
  extractPrimitiveStats,
  normalizeDomainLabel,
  noteInlineAuthorProfile,
  noteAuthorIdentifier,
  profileFallbackAvatarDataUrl,
  profileIdentifier,
  profileLabel,
  profilePictureUrl,
  profileSecondaryLabel,
  extractDomainsFromNote,
  extractHashtagsFromNote,
  extractRelayHostsFromNote,
  truncateIdentifier,
} from "@/components/explorer/utils";
import type { EventRecord, Profile } from "@/lib/types/api";

export function NoteCard({
  note,
  author,
  href,
  rank,
  showFullContent = false,
  discoverySignals = false,
}: {
  note: EventRecord;
  author?: Profile;
  href?: string;
  rank?: number;
  showFullContent?: boolean;
  discoverySignals?: boolean;
}) {
  const resolvedAuthor = author ?? noteInlineAuthorProfile(note);
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
  const authorLabel = resolvedAuthor ? profileLabel(resolvedAuthor) : noteAuthorIdentifier(note);
  const authorSecondaryLabel = resolvedAuthor
    ? profileSecondaryLabel(resolvedAuthor)
    : noteAuthorIdentifier(note);
  const authorPictureUrl = resolvedAuthor ? profilePictureUrl(resolvedAuthor) : null;
  const authorAvatarSrc =
    resolvedAuthor && (authorPictureUrl ?? profileFallbackAvatarDataUrl(resolvedAuthor));
  const authorHref =
    resolvedAuthor && profileIdentifier(resolvedAuthor) !== "unknown"
      ? `/profiles/${encodeURIComponent(profileIdentifier(resolvedAuthor))}`
      : undefined;
  const content =
    typeof note.content === "string" && note.content.length > 0 ? note.content : "(no content)";
  const preview = getNotePreviewPresentation(note);
  const presentationContent = preview.contentForCard || content;
  const prefersCompactClamp = preview.isCompact || preview.mode === "long_identifier_heavy_preview";
  const clampClassName = showFullContent
    ? "whitespace-pre-wrap"
    : prefersCompactClamp
      ? "line-clamp-2"
      : "line-clamp-4";
  const rawMetrics = extractPrimitiveStats(note, [
    "id",
    "pubkey",
    "kind",
    "created_at",
    "content",
    "tags",
  ]).filter((entry) => /(reply|repost|boost|zap|like|reaction)/i.test(entry.label));
  const noteMetricPriority = [/repl(y|ies)/i, /(repost|boost)/i, /zap/i, /(like|reaction)/i];
  const metrics = noteMetricPriority
    .map((matcher) => rawMetrics.find((entry) => matcher.test(entry.label)))
    .filter((entry): entry is (typeof rawMetrics)[number] => Boolean(entry))
    .slice(0, 3);
  const isTopRank = typeof rank === "number" && rank <= 3;
  const noteDomains = extractDomainsFromNote(note, 2).map((domain) => ({
    raw: domain,
    label: truncateIdentifier(normalizeDomainLabel(domain), "domain", "primary"),
  }));
  const noteHashtags = extractHashtagsFromNote(note, 2);
  const relayHosts = extractRelayHostsFromNote(note, 2).map((relayHost) => ({
    raw: relayHost,
    label: truncateIdentifier(relayHost, "relay", "primary"),
  }));
  const reasonCandidates = mapNoteWhyNow(note);
  const rankLabel = typeof rank === "number" ? `#${rank}` : null;

  return (
    <article
      className={`${cardTierClassName("standard")} ${
        isTopRank ? "border-indigo-500/20 bg-zinc-900/60" : "border-zinc-800/85 bg-zinc-900/45"
      }`}
    >
      <div className="flex items-start gap-3">
        {authorAvatarSrc ? (
          <Image
            src={authorAvatarSrc}
            alt={authorLabel}
            width={44}
            height={44}
            unoptimized
            className="h-10 w-10 rounded-full border border-zinc-700 object-cover sm:h-11 sm:w-11"
          />
        ) : (
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-950/70 text-xs text-zinc-500 sm:h-11 sm:w-11">
            ?
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {rankLabel ? (
              <DiscoveryPill
                tone={isTopRank ? "entity" : "rank"}
                className="px-2 py-0.5 text-[10px]"
              >
                {rankLabel}
              </DiscoveryPill>
            ) : null}
            {authorHref ? (
              <Link href={authorHref} className="font-medium text-zinc-200 hover:text-white">
                {authorLabel}
              </Link>
            ) : (
              <span className="font-medium text-zinc-200">{authorLabel}</span>
            )}
            {authorSecondaryLabel ? (
              <span className="text-zinc-500" title={authorSecondaryLabel}>
                {truncateIdentifier(authorSecondaryLabel, "npub", "secondary")}
              </span>
            ) : null}
            <span className="text-zinc-600">•</span>
            <Timestamp unixSeconds={note.created_at} />
          </div>
        </div>
      </div>

      {preview.treatmentLabel ? (
        <div className="mt-2.5 text-[11px] tracking-[0.14em] text-zinc-500 uppercase sm:mt-3">
          {preview.treatmentLabel}
        </div>
      ) : null}
      {preview.prefersMediaFirst && typeof note.content === "string" && note.content.length > 0 ? (
        <NoteMedia content={note.content} />
      ) : null}
      <p
        className={`mt-2.5 text-sm leading-5 [overflow-wrap:anywhere] text-zinc-100 sm:leading-6 ${clampClassName}`}
      >
        {presentationContent}
      </p>
      {!preview.prefersMediaFirst && typeof note.content === "string" && note.content.length > 0 ? (
        <NoteMedia content={note.content} />
      ) : null}

      {noteDomains.length > 0 ? (
        <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-zinc-400">
          <span className="text-zinc-500">Links</span>
          {noteDomains.map((domain) => (
            <span key={domain.raw} className="inline-flex items-center gap-2">
              <span className="text-zinc-600">•</span>
              <Link
                href={`/domains/${encodeURIComponent(domain.raw)}`}
                title={domain.raw}
                className="text-zinc-300 transition hover:text-zinc-100"
              >
                {domain.label}
              </Link>
            </span>
          ))}
        </div>
      ) : null}

      {noteHashtags.length > 0 ? (
        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-zinc-400">
          <span className="text-zinc-500">Topics</span>
          {noteHashtags.map((hashtag) => (
            <span key={hashtag} className="inline-flex items-center gap-2">
              <span className="text-zinc-600">•</span>
              <Link
                href={`/hashtags/${encodeURIComponent(hashtag)}`}
                className="text-zinc-300 transition hover:text-zinc-100"
              >
                #{hashtag}
              </Link>
            </span>
          ))}
        </div>
      ) : null}

      {relayHosts.length > 0 ? (
        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-zinc-400">
          <span className="text-zinc-500">Relays</span>
          {relayHosts.map((relayHost) => (
            <span key={relayHost.raw} className="inline-flex items-center gap-2">
              <span className="text-zinc-600">•</span>
              <Link
                href={`/relays/${encodeURIComponent(relayHost.raw)}`}
                title={relayHost.raw}
                className="text-zinc-300 transition hover:text-indigo-200"
              >
                {relayHost.label}
              </Link>
            </span>
          ))}
        </div>
      ) : null}

      {discoverySignals ? <WhyNow reasons={reasonCandidates} className="mt-2.5 sm:mt-3" /> : null}

      <DiscoveryStatPills stats={metrics} className="mt-2.5 sm:mt-3" />

      {resolvedNoteId ? (
        <div className="mt-2.5 flex flex-wrap items-center gap-2 text-xs text-zinc-400 sm:mt-3">
          <DiscoveryActionLinks
            actions={[
              { label: "Open note", href: noteHref },
              {
                label: "Inspect thread",
                href: `/notes/${encodeURIComponent(resolvedNoteId)}#conversation-context`,
              },
              {
                label: "Seen on relays",
                href: `/notes/${encodeURIComponent(resolvedNoteId)}#note-provenance`,
              },
            ]}
          />
        </div>
      ) : null}
    </article>
  );
}
