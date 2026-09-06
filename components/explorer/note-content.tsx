import Link from "next/link";

import {
  formatMentionLabel,
  formatNaddrLabel,
  formatUrlForDisplay,
  lookupProfileByHandle,
  lookupProfileByPubkey,
  sanitizeExternalHref,
  truncateIdentifier,
} from "@/components/explorer/utils";
import { isNoteMediaUrl, stripNoteMediaUrls } from "@/lib/notes/media";
import { hexToNpub } from "@/lib/nostr/nip19";
import { tokenizeNoteContent, type NoteToken } from "@/lib/notes/tokenize";
import { buildProfileActivityTabHref } from "@/lib/profile/activity-tabs";
import type { EventRecord, Profile } from "@/lib/types/api";

export type NoteContentResolution = {
  profilesByPubkey?: Record<string, Profile | undefined>;
  eventsById?: Record<string, EventRecord | undefined>;
};

function naddrHref(pubkey: string): string {
  const npub = hexToNpub(pubkey) ?? pubkey;
  return buildProfileActivityTabHref(
    `/profiles/${encodeURIComponent(npub)}`,
    new URLSearchParams(),
    "long_form"
  );
}

function QuoteCard({
  event,
  author,
  resolution,
}: {
  event: EventRecord;
  author?: Profile;
  resolution?: NoteContentResolution;
}) {
  const id =
    (typeof event.id === "string" && event.id) ||
    (typeof event.event_id === "string" && event.event_id) ||
    "";
  const href = id ? `/notes/${encodeURIComponent(id)}` : undefined;
  const label =
    (typeof author?.display_name === "string" && author.display_name) ||
    (typeof author?.name === "string" && author.name) ||
    (typeof event.pubkey === "string" ? event.pubkey.slice(0, 12) : "Note");
  const cleaned =
    typeof event.content === "string" && event.content.length > 0
      ? stripNoteMediaUrls(event.content)
      : "";

  const header = <div className="text-ink-soft text-xs font-medium">{label}</div>;

  return (
    <div className="border-edge/80 bg-surface-sunken/40 mt-1.5 rounded-lg border px-3 py-2">
      {href ? (
        <Link href={href} className="hover:text-ink-strong block transition">
          {header}
        </Link>
      ) : (
        header
      )}
      {cleaned.length > 0 ? (
        <NoteContent
          tokens={tokenizeNoteContent(cleaned, { tags: event.tags })}
          className="text-ink-dim mt-1 line-clamp-3 text-sm [overflow-wrap:anywhere] whitespace-pre-wrap"
          showQuotes={false}
          resolution={resolution}
        />
      ) : (
        <p className="text-ink-dim mt-1 line-clamp-3 text-sm [overflow-wrap:anywhere] whitespace-pre-wrap">
          (no content)
        </p>
      )}
    </div>
  );
}

export function NoteContent({
  tokens,
  className = "",
  showQuotes = true,
  resolution,
  hideLinkPreviewUrls = [],
  as: Tag = "div",
}: {
  tokens: NoteToken[];
  className?: string;
  showQuotes?: boolean;
  resolution?: NoteContentResolution;
  /** URLs rendered as preview cards; omit from inline link text. */
  hideLinkPreviewUrls?: string[];
  as?: "div" | "span";
}) {
  const hiddenLinks = new Set(hideLinkPreviewUrls);
  return (
    <Tag
      className={`text-ink text-sm leading-5 [overflow-wrap:anywhere] sm:leading-6 ${className}`}
    >
      {tokens.map((token, index) => {
        const key = `${token.type}-${index}`;
        switch (token.type) {
          case "text":
            return <span key={key}>{token.value}</span>;
          case "url": {
            // Media and card-preview URLs are rendered elsewhere.
            if (isNoteMediaUrl(token.href) || hiddenLinks.has(token.href)) return null;
            const href = sanitizeExternalHref(token.href);
            if (!href) return <span key={key}>{token.value}</span>;
            return (
              <a
                key={key}
                href={href}
                title={href}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="text-link hover:text-link-hover underline-offset-2 hover:underline"
              >
                {formatUrlForDisplay(token.href, "secondary")}
              </a>
            );
          }
          case "hashtag":
            return (
              <Link
                key={key}
                href={`/hashtags/${encodeURIComponent(token.tag)}`}
                className="text-link hover:text-link-hover font-medium"
              >
                #{token.tag}
              </Link>
            );
          case "mention": {
            const npub = hexToNpub(token.pubkey) ?? token.pubkey;
            return (
              <Link
                key={key}
                href={`/profiles/${encodeURIComponent(npub)}`}
                className="text-link hover:text-link-hover font-medium"
                title={npub}
              >
                {formatMentionLabel(token.pubkey, resolution?.profilesByPubkey)}
              </Link>
            );
          }
          case "handle": {
            const profile = lookupProfileByHandle(token.handle, resolution?.profilesByPubkey);
            const pubkey = typeof profile?.pubkey === "string" ? profile.pubkey : "";
            if (!pubkey) {
              return <span key={key}>{token.value}</span>;
            }
            const npub = hexToNpub(pubkey) ?? pubkey;
            return (
              <Link
                key={key}
                href={`/profiles/${encodeURIComponent(npub)}`}
                className="text-link hover:text-link-hover font-medium"
                title={npub}
              >
                {formatMentionLabel(pubkey, resolution?.profilesByPubkey)}
              </Link>
            );
          }
          case "event": {
            const quoted =
              resolution?.eventsById?.[token.id] ??
              resolution?.eventsById?.[token.id.toLowerCase()];
            const author = quoted?.pubkey
              ? lookupProfileByPubkey(quoted.pubkey, resolution?.profilesByPubkey)
              : undefined;
            const eventLabel = truncateIdentifier(
              token.value.replace(/^nostr:/i, ""),
              "note",
              "primary"
            );
            return (
              <span key={key} className="inline">
                <Link
                  href={`/notes/${encodeURIComponent(token.id)}`}
                  className="text-link hover:text-link-hover font-mono text-xs"
                  title={token.value}
                >
                  {eventLabel}
                </Link>
                {showQuotes && quoted ? (
                  <QuoteCard event={quoted} author={author} resolution={resolution} />
                ) : null}
              </span>
            );
          }
          case "address": {
            const addressLabel = formatNaddrLabel(token, resolution?.profilesByPubkey);
            return (
              <Link
                key={key}
                href={naddrHref(token.pubkey)}
                className="text-link hover:text-link-hover font-medium"
                title={`kind:${token.kind} ${token.identifier}`}
              >
                {addressLabel}
              </Link>
            );
          }
          case "redacted":
            return (
              <span
                key={key}
                className="bg-danger/15 text-danger rounded px-1 font-mono text-xs"
                title="Secret key redacted"
              >
                [redacted nsec]
              </span>
            );
          default:
            return null;
        }
      })}
    </Tag>
  );
}

/** Tokenize and render free-form UGC (bios, summaries) without quote cards. */
export function RichInlineText({
  text,
  tags,
  className = "",
  resolution,
  hideLinkPreviewUrls,
  as,
}: {
  text: string;
  tags?: unknown;
  className?: string;
  resolution?: NoteContentResolution;
  hideLinkPreviewUrls?: string[];
  as?: "div" | "span";
}) {
  return (
    <NoteContent
      tokens={tokenizeNoteContent(text, { tags })}
      className={className}
      showQuotes={false}
      resolution={resolution}
      hideLinkPreviewUrls={hideLinkPreviewUrls}
      as={as}
    />
  );
}
