import Link from "next/link";

import { NoteContent, type NoteContentResolution } from "@/components/explorer/note-content";
import { NoteMedia } from "@/components/explorer/note-media";
import { getNotePreviewPresentation } from "@/components/explorer/note-preview";
import { ProfileAvatar } from "@/components/explorer/profile-avatar";
import { Timestamp } from "@/components/explorer/timestamp";
import {
  cardTierClassName,
  DiscoveryActionLinks,
  DiscoveryStatPills,
} from "@/components/explorer/card-grammar";
import { mapNoteWhyNow, WhyNow } from "@/components/explorer/why-now";
import {
  extractPrimitiveStats,
  normalizeDomainLabel,
  noteInlineAuthorProfile,
  noteAuthorIdentifier,
  profileIdentifier,
  profileLabel,
  profileSecondaryLabel,
  extractDomainsFromNote,
  extractHashtagsFromNote,
  extractRelayHostsFromNote,
  truncateIdentifier,
} from "@/components/explorer/utils";
import { tokenizeNoteContent } from "@/lib/notes/tokenize";
import type { EventRecord, Profile } from "@/lib/types/api";

export function NoteCard({
  note,
  author,
  href,
  rank,
  showFullContent = false,
  discoverySignals = false,
  contentResolution,
}: {
  note: EventRecord;
  author?: Profile;
  href?: string;
  rank?: number;
  showFullContent?: boolean;
  discoverySignals?: boolean;
  contentResolution?: NoteContentResolution;
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
  const authorAvatarProfile =
    resolvedAuthor ??
    (typeof note.pubkey === "string" && note.pubkey.length > 0 ? { pubkey: note.pubkey } : null);
  const authorHref =
    resolvedAuthor && profileIdentifier(resolvedAuthor) !== "unknown"
      ? `/profiles/${encodeURIComponent(profileIdentifier(resolvedAuthor))}`
      : typeof note.pubkey === "string" && note.pubkey.length > 0
        ? `/profiles/${encodeURIComponent(note.pubkey)}`
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
    .slice(0, 2);
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
  const rankLabel = typeof rank === "number" ? String(rank).padStart(2, "0") : null;

  return (
    <article
      className={`group ${cardTierClassName("standard")} ${
        isTopRank ? "border-accent-soft/40" : "border-edge/70"
      }`}
    >
      <div className="flex items-start gap-3">
        {rankLabel ? (
          <span className="text-accent-ink w-7 shrink-0 pt-2 text-lg leading-none tracking-[-0.05em] tabular-nums">
            {rankLabel}
          </span>
        ) : null}
        {authorAvatarProfile ? (
          <ProfileAvatar
            profile={authorAvatarProfile}
            size={44}
            alt={authorLabel}
            className="border-edge-strong h-10 w-10 rounded-full border object-cover sm:h-11 sm:w-11"
          />
        ) : (
          <div
            aria-hidden
            className="bg-surface-sunken/70 text-ink-faint flex h-10 w-10 items-center justify-center rounded-full text-xs sm:h-11 sm:w-11"
          >
            {authorLabel.slice(0, 1).toUpperCase() || "?"}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {authorHref ? (
              <Link href={authorHref} className="text-ink-soft hover:text-ink-strong font-medium">
                {authorLabel}
              </Link>
            ) : (
              <span className="text-ink-soft font-medium">{authorLabel}</span>
            )}
            {authorSecondaryLabel ? (
              <span className="text-ink-faint" title={authorSecondaryLabel}>
                {truncateIdentifier(authorSecondaryLabel, "npub", "secondary")}
              </span>
            ) : null}
            <span aria-hidden className="text-ink-faint/70">
              •
            </span>
            <Timestamp unixSeconds={note.created_at} />
          </div>
        </div>
      </div>

      {preview.prefersMediaFirst && typeof note.content === "string" && note.content.length > 0 ? (
        <NoteMedia content={note.content} />
      ) : null}
      <NoteContent
        tokens={tokenizeNoteContent(presentationContent)}
        className={`mt-2.5 ${clampClassName}`}
        showQuotes={showFullContent}
        resolution={contentResolution}
      />
      {!preview.prefersMediaFirst && typeof note.content === "string" && note.content.length > 0 ? (
        <NoteMedia content={note.content} />
      ) : null}

      {noteDomains.length > 0 ? (
        <div className="text-ink-muted mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
          <span className="text-ink-faint">Links</span>
          {noteDomains.map((domain) => (
            <span key={domain.raw} className="inline-flex items-center gap-2">
              <span aria-hidden className="text-ink-faint/70">
                •
              </span>
              <Link
                href={`/domains/${encodeURIComponent(domain.raw)}`}
                title={domain.raw}
                className="text-ink-dim hover:text-ink transition"
              >
                {domain.label}
              </Link>
            </span>
          ))}
        </div>
      ) : null}

      {noteHashtags.length > 0 ? (
        <div className="text-ink-muted mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
          <span className="text-ink-faint">Topics</span>
          {noteHashtags.map((hashtag) => (
            <span key={hashtag} className="inline-flex items-center gap-2">
              <span aria-hidden className="text-ink-faint/70">
                •
              </span>
              <Link
                href={`/hashtags/${encodeURIComponent(hashtag)}`}
                className="text-ink-dim hover:text-ink transition"
              >
                #{hashtag}
              </Link>
            </span>
          ))}
        </div>
      ) : null}

      {relayHosts.length > 0 ? (
        <div className="text-ink-muted mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
          <span className="text-ink-faint">Relays</span>
          {relayHosts.map((relayHost) => (
            <span key={relayHost.raw} className="inline-flex items-center gap-2">
              <span aria-hidden className="text-ink-faint/70">
                •
              </span>
              <Link
                href={`/relays/${encodeURIComponent(relayHost.raw)}`}
                title={relayHost.raw}
                className="hover:text-link-hover text-ink-dim transition"
              >
                {relayHost.label}
              </Link>
            </span>
          ))}
        </div>
      ) : null}

      {discoverySignals ? (
        <WhyNow reasons={reasonCandidates} showLabel={false} className="mt-2.5 sm:mt-3" />
      ) : null}

      <DiscoveryStatPills stats={metrics} className="mt-2.5 sm:mt-3" />

      {resolvedNoteId ? (
        <div className="text-ink-muted mt-2.5 flex flex-wrap items-center gap-2 text-xs sm:mt-3">
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
