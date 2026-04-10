import Image from "next/image";
import Link from "next/link";

import { NoteMedia } from "@/components/explorer/note-media";
import { Timestamp } from "@/components/explorer/timestamp";
import {
  extractPrimitiveStats,
  formatMetricLabel,
  noteAuthorIdentifier,
  profileFallbackAvatarDataUrl,
  profileIdentifier,
  profileLabel,
  profilePictureUrl,
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
  discoverySignals = false,
}: {
  note: EventRecord;
  author?: Profile;
  href?: string;
  rank?: number;
  showFullContent?: boolean;
  discoverySignals?: boolean;
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
  const authorPictureUrl = author ? profilePictureUrl(author) : null;
  const authorAvatarSrc = author && (authorPictureUrl ?? profileFallbackAvatarDataUrl(author));
  const authorHref =
    author && profileIdentifier(author) !== "unknown"
      ? `/profiles/${encodeURIComponent(profileIdentifier(author))}`
      : undefined;
  const content =
    typeof note.content === "string" && note.content.length > 0 ? note.content : "(no content)";
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
  const noteDomains = extractDomainsFromNote(note, 2);
  const noteHashtags = extractHashtagsFromNote(note, 2);
  const relayHosts = extractRelayHostsFromNote(note, 2);
  const hasRecentPublishSignal =
    typeof note.created_at === "number" && Number.isFinite(note.created_at);
  const hasEngagementSignal = metrics.some((metric) =>
    /(like|reply|zap|boost|reaction|engagement|score|count)/i.test(metric.label)
  );
  const hasReplySignal = metrics.some((metric) => /repl(y|ies)/i.test(metric.label));
  const trendReasons: string[] = [];
  if (hasEngagementSignal) {
    trendReasons.push("rising engagement");
  }
  if (relayHosts.length > 0) {
    trendReasons.push(
      relayHosts.length > 1 ? `relay spread: ${relayHosts.length}` : "relay spread"
    );
  }
  if (hasReplySignal) {
    trendReasons.push("recent replies");
  }
  if (hasRecentPublishSignal) {
    trendReasons.push("recently published");
  }
  if (trendReasons.length === 0) {
    trendReasons.push("standing out now");
  }
  const rankLabel = typeof rank === "number" ? `#${rank}` : null;

  return (
    <article
      className={`rounded-[1.15rem] border p-4 sm:p-5 ${
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
              <span
                className={isTopRank ? "font-medium text-indigo-300" : "font-medium text-zinc-500"}
              >
                {rankLabel}
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
          </div>
        </div>
      </div>

      <p
        className={`mt-2.5 text-sm leading-5 [overflow-wrap:anywhere] text-zinc-100 sm:mt-3 sm:leading-6 ${
          showFullContent ? "whitespace-pre-wrap" : "line-clamp-4"
        }`}
      >
        {content}
      </p>

      {typeof note.content === "string" && note.content.length > 0 ? (
        <NoteMedia content={note.content} />
      ) : null}

      {noteDomains.length > 0 ? (
        <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-zinc-400">
          <span className="text-zinc-500">Links</span>
          {noteDomains.map((domain) => (
            <span key={domain} className="inline-flex items-center gap-2">
              <span className="text-zinc-600">•</span>
              <Link
                href={`/domains/${encodeURIComponent(domain)}`}
                className="text-zinc-300 transition hover:text-zinc-100"
              >
                {domain}
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
            <span key={relayHost} className="inline-flex items-center gap-2">
              <span className="text-zinc-600">•</span>
              <Link
                href={`/relays/${encodeURIComponent(relayHost)}`}
                className="break-all text-zinc-300 transition hover:text-indigo-200"
              >
                {relayHost}
              </Link>
            </span>
          ))}
        </div>
      ) : null}

      {discoverySignals ? (
        <div className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-zinc-400 sm:mt-3">
          <span className="text-zinc-500">Why now</span>
          <span className="text-zinc-600">•</span>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            {trendReasons.slice(0, 2).map((reason, index) => (
              <span key={reason} className="inline-flex items-center gap-2">
                {index > 0 ? <span className="text-zinc-600">•</span> : null}
                <span>{reason}</span>
              </span>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-300 sm:mt-3">
        {metrics.map((metric) => (
          <span key={metric.label} className="inline-flex items-center gap-1.5">
            <span className="text-zinc-500">{formatMetricLabel(metric.label)}</span>
            <span className="font-medium text-zinc-100">
              {truncateMiddle(String(metric.value), 18)}
            </span>
          </span>
        ))}
      </div>

      {resolvedNoteId ? (
        <div className="mt-2.5 text-xs text-zinc-500 sm:mt-3">
          Event {truncateMiddle(resolvedNoteId, 24)}
        </div>
      ) : null}

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
            Inspect thread
          </Link>
          <span className="text-zinc-600">•</span>
          <Link
            href={`/notes/${encodeURIComponent(resolvedNoteId)}#note-provenance`}
            className="text-indigo-300 hover:text-indigo-200"
          >
            Seen on relays
          </Link>
        </div>
      ) : null}
    </article>
  );
}
