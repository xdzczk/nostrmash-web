import Link from "next/link";

import { sanitizeExternalHref } from "@/components/explorer/utils";
import { hexToNpub } from "@/lib/nostr/nip19";
import type { NoteToken } from "@/lib/notes/tokenize";
import type { EventRecord, Profile } from "@/lib/types/api";

export type NoteContentResolution = {
  profilesByPubkey?: Record<string, Profile | undefined>;
  eventsById?: Record<string, EventRecord | undefined>;
};

function mentionLabel(pubkey: string, profiles?: NoteContentResolution["profilesByPubkey"]) {
  const profile = profiles?.[pubkey];
  const display =
    (typeof profile?.display_name === "string" && profile.display_name) ||
    (typeof profile?.name === "string" && profile.name) ||
    null;
  if (display) return `@${display}`;
  const npub = hexToNpub(pubkey);
  return npub ? `@${npub.slice(0, 12)}…` : `@${pubkey.slice(0, 8)}…`;
}

function QuoteCard({ event, author }: { event: EventRecord; author?: Profile }) {
  const id =
    (typeof event.id === "string" && event.id) ||
    (typeof event.event_id === "string" && event.event_id) ||
    "";
  const href = id ? `/notes/${encodeURIComponent(id)}` : undefined;
  const label =
    (typeof author?.display_name === "string" && author.display_name) ||
    (typeof author?.name === "string" && author.name) ||
    (typeof event.pubkey === "string" ? event.pubkey.slice(0, 12) : "Note");
  const snippet =
    typeof event.content === "string" && event.content.length > 0
      ? event.content.length > 180
        ? `${event.content.slice(0, 177)}…`
        : event.content
      : "(no content)";

  const body = (
    <div className="border-edge/80 bg-surface-sunken/40 mt-1.5 rounded-lg border px-3 py-2">
      <div className="text-ink-soft text-xs font-medium">{label}</div>
      <p className="text-ink-dim mt-1 line-clamp-3 text-sm [overflow-wrap:anywhere] whitespace-pre-wrap">
        {snippet}
      </p>
    </div>
  );

  return href ? (
    <Link href={href} className="hover:border-accent/40 block transition">
      {body}
    </Link>
  ) : (
    body
  );
}

export function NoteContent({
  tokens,
  className = "",
  showQuotes = true,
  resolution,
}: {
  tokens: NoteToken[];
  className?: string;
  showQuotes?: boolean;
  resolution?: NoteContentResolution;
}) {
  return (
    <div
      className={`text-ink text-sm leading-5 [overflow-wrap:anywhere] sm:leading-6 ${className}`}
    >
      {tokens.map((token, index) => {
        const key = `${token.type}-${index}`;
        switch (token.type) {
          case "text":
            return <span key={key}>{token.value}</span>;
          case "url": {
            const href = sanitizeExternalHref(token.href);
            if (!href) return <span key={key}>{token.value}</span>;
            return (
              <a
                key={key}
                href={href}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="text-link hover:text-link-hover underline-offset-2 hover:underline"
              >
                {token.value}
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
                {mentionLabel(token.pubkey, resolution?.profilesByPubkey)}
              </Link>
            );
          }
          case "event": {
            const quoted =
              resolution?.eventsById?.[token.id] ??
              resolution?.eventsById?.[token.id.toLowerCase()];
            const author =
              quoted?.pubkey && resolution?.profilesByPubkey
                ? (resolution.profilesByPubkey[quoted.pubkey.toLowerCase()] ??
                  resolution.profilesByPubkey[quoted.pubkey])
                : undefined;
            return (
              <span key={key} className="inline">
                <Link
                  href={`/notes/${encodeURIComponent(token.id)}`}
                  className="text-link hover:text-link-hover font-mono text-xs"
                >
                  {token.value.length > 24 ? `${token.value.slice(0, 20)}…` : token.value}
                </Link>
                {showQuotes && quoted ? <QuoteCard event={quoted} author={author} /> : null}
              </span>
            );
          }
          case "address":
            return (
              <Link
                key={key}
                href={`/profiles/${encodeURIComponent(hexToNpub(token.pubkey) ?? token.pubkey)}`}
                className="text-link hover:text-link-hover font-mono text-xs"
                title={`kind:${token.kind} ${token.identifier}`}
              >
                {token.value.length > 24 ? `${token.value.slice(0, 20)}…` : token.value}
              </Link>
            );
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
    </div>
  );
}
