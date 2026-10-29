import Link from "next/link";

import {
  CardHitTarget,
  cardHitTargetClassName,
  cardTierClassName,
  DiscoveryPill,
} from "@/components/explorer/card-grammar";
import { EventByline } from "@/components/explorer/event-byline";
import type { NoteContentResolution } from "@/components/explorer/note-content";
import { BlossomImage } from "@/components/ui/blossom-image";
import { Timestamp } from "@/components/explorer/timestamp";
import {
  lookupProfileByPubkey,
  noteAuthorIdentifier,
  noteInlineAuthorProfile,
  profileHref,
  profileLabel,
  truncateIdentifier,
  truncateProfileLabel,
} from "@/components/explorer/utils";
import { eventPageHref } from "@/lib/notes/kinds";
import { getLivePresentation, type LiveStatus } from "@/lib/notes/live-activity";
import type { EventRecord, Profile } from "@/lib/types/api";

function statusLabel(status: LiveStatus | undefined): string {
  if (status === "planned") return "Planned";
  if (status === "ended") return "Ended";
  if (status === "live") return "Live";
  return "Live activity";
}

export function LiveCard({
  event,
  author,
  surface = "list",
  showAuthor = true,
  profilesByPubkey,
  priority = false,
}: {
  event: EventRecord;
  author?: Profile;
  surface?: "list" | "detail" | "reply";
  showAuthor?: boolean;
  profilesByPubkey?: NoteContentResolution["profilesByPubkey"];
  priority?: boolean;
}) {
  const presentation = getLivePresentation(event);
  if (!presentation) return null;
  const href = eventPageHref(event);
  const resolvedAuthor = author ?? noteInlineAuthorProfile(event);
  const authorLabel = resolvedAuthor ? profileLabel(resolvedAuthor) : noteAuthorIdentifier(event);
  const interactive = Boolean(href) && surface === "list";

  return (
    <article
      className={`group ${cardTierClassName("standard")} border-edge/70 ${
        interactive ? cardHitTargetClassName : ""
      }`}
      aria-label={`${statusLabel(presentation.status)}: ${presentation.title}`}
      data-kind={event.kind}
    >
      <div className="flex flex-wrap items-center gap-2">
        <DiscoveryPill tone={presentation.status === "live" ? "entity" : "neutral"}>
          <span className="inline-flex items-center gap-1.5">
            {presentation.status === "live" ? <span className="nm-live-dot" aria-hidden /> : null}
            {statusLabel(presentation.status)}
          </span>
        </DiscoveryPill>
      </div>

      <h3 className="text-ink mt-2 text-base leading-6 font-semibold tracking-tight [overflow-wrap:anywhere] sm:text-lg">
        {href && !interactive ? (
          <Link href={href} className="hover:text-ink-strong">
            {presentation.title}
          </Link>
        ) : (
          presentation.title
        )}
      </h3>

      {presentation.image ? (
        <div className="border-edge bg-surface-sunken/60 mt-3 max-w-3xl overflow-hidden rounded-[var(--radius-control)] border">
          <BlossomImage
            src={presentation.image}
            alt=""
            loading={priority ? "eager" : "lazy"}
            decoding="async"
            referrerPolicy="no-referrer"
            className="max-h-80 w-full object-cover"
          />
        </div>
      ) : null}

      {presentation.summary ? (
        <p className="text-ink-dim mt-3 text-sm leading-6 whitespace-pre-wrap">
          {presentation.summary}
        </p>
      ) : null}

      <div className="text-ink-muted mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
        {presentation.starts !== undefined ? (
          <span>
            Starts <Timestamp unixSeconds={presentation.starts} />
          </span>
        ) : null}
        {presentation.ends !== undefined ? (
          <span>
            Ends <Timestamp unixSeconds={presentation.ends} />
          </span>
        ) : null}
        {presentation.streaming ? (
          <a
            href={presentation.streaming}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="text-link hover:text-link-hover"
          >
            Stream
          </a>
        ) : null}
        {presentation.recording ? (
          <a
            href={presentation.recording}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="text-link hover:text-link-hover"
          >
            Recording
          </a>
        ) : null}
      </div>

      {presentation.participants.length > 0 ? (
        <ul className="mt-3 flex flex-wrap gap-2">
          {presentation.participants.map((participant) => {
            const profile = lookupProfileByPubkey(participant.pubkey, profilesByPubkey);
            const name = profile
              ? truncateProfileLabel(profileLabel(profile))
              : truncateIdentifier(participant.pubkey, "pubkey", "secondary");
            const personHref = profileHref(profile, participant.pubkey);
            return (
              <li
                key={`${participant.role}:${participant.pubkey}`}
                className="text-ink-dim text-xs"
              >
                <span className="text-ink-faint">{participant.role}</span>{" "}
                {personHref ? (
                  <Link href={personHref} className="text-ink-soft hover:text-ink font-medium">
                    {name}
                  </Link>
                ) : (
                  <span className="text-ink-soft font-medium">{name}</span>
                )}
              </li>
            );
          })}
        </ul>
      ) : null}

      <div className="mt-3">
        <EventByline event={event} author={author} showAuthor={showAuthor} />
      </div>

      {interactive && href ? (
        <CardHitTarget href={href} label={`Open live activity by ${authorLabel}`} />
      ) : null}
    </article>
  );
}
