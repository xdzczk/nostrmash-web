import Link from "next/link";
import type { ReactNode } from "react";

import type { NoteCardDensity } from "@/components/explorer/note-card";
import type { NoteContentResolution } from "@/components/explorer/note-content";
import { ProfileAvatar } from "@/components/explorer/profile-avatar";
import { Timestamp } from "@/components/explorer/timestamp";
import {
  lookupProfileByPubkey,
  noteAuthorIdentifier,
  noteInlineAuthorProfile,
  profileHref,
  profileLabel,
  truncateProfileLabel,
} from "@/components/explorer/utils";
import { parseAddressCoordinate } from "@/lib/notes/event-tags";
import { buildProfileActivityTabHref } from "@/lib/profile/activity-tabs";
import { isGenericRepostInnerKind } from "@/lib/notes/kinds";
import { hexToNpub } from "@/lib/nostr/nip19";
import { parseRepostTarget } from "@/lib/notes/repost";
import type { EventRecord, Profile } from "@/lib/types/api";

function addressTab(kind: number): "long_form" | "media" | "live" | "notes" {
  if (kind === 30023) return "long_form";
  if (kind === 30311) return "live";
  if (kind === 20 || kind === 21 || kind === 22 || kind === 34235 || kind === 34236) {
    return "media";
  }
  return "notes";
}

/**
 * Kind 16 generic repost. The inner event uses the same card as a direct post
 * of that kind. Kind 6 stays on {@link RepostCard}.
 */
export function GenericRepostCard({
  repost,
  author,
  contentResolution,
  renderEvent,
}: {
  repost: EventRecord;
  author?: Profile;
  contentResolution?: NoteContentResolution;
  density?: NoteCardDensity;
  renderEvent: (event: EventRecord, author?: Profile) => ReactNode;
}) {
  const reposter = author ?? noteInlineAuthorProfile(repost);
  const reposterLabel = reposter ? profileLabel(reposter) : noteAuthorIdentifier(repost);
  const reposterHref = profileHref(
    reposter,
    typeof repost.pubkey === "string" ? repost.pubkey : undefined
  );
  const target = parseRepostTarget(repost);
  const lookedUp = target.targetId
    ? (contentResolution?.eventsById?.[target.targetId] ??
      contentResolution?.eventsById?.[target.targetId.toLowerCase()])
    : undefined;
  const embedded =
    target.embedded && isGenericRepostInnerKind(target.embedded.kind) ? target.embedded : undefined;
  const original = lookedUp && isGenericRepostInnerKind(lookedUp.kind) ? lookedUp : embedded;
  const originalAuthor =
    original && typeof original.pubkey === "string"
      ? lookupProfileByPubkey(original.pubkey, contentResolution?.profilesByPubkey)
      : target.targetPubkey
        ? lookupProfileByPubkey(target.targetPubkey, contentResolution?.profilesByPubkey)
        : undefined;
  const coordinate = parseAddressCoordinate(target.targetAddress);
  const coordinateHref = coordinate
    ? buildProfileActivityTabHref(
        `/profiles/${encodeURIComponent(hexToNpub(coordinate.pubkey) ?? coordinate.pubkey)}`,
        new URLSearchParams(),
        addressTab(coordinate.kind)
      )
    : undefined;

  return (
    <article
      className="border-edge/65 border-b px-1 py-5 sm:px-2 sm:py-6"
      aria-label={`Repost by ${reposterLabel}`}
    >
      <div className="text-ink-dim flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[13px]">
        <span aria-hidden className="text-ink-faint">
          ↻
        </span>
        {reposter ? (
          <ProfileAvatar
            profile={reposter}
            size={18}
            alt=""
            className="h-[18px] w-[18px] rounded-full object-cover"
          />
        ) : null}
        {reposterHref ? (
          <Link
            href={reposterHref}
            className="text-ink-soft hover:text-ink-strong inline-flex min-h-6 items-center font-medium hover:underline"
          >
            {truncateProfileLabel(reposterLabel)}
          </Link>
        ) : (
          <span className="text-ink-soft font-medium">{truncateProfileLabel(reposterLabel)}</span>
        )}
        <span>reposted</span>
        <span aria-hidden className="text-ink-faint/70">
          •
        </span>
        <Timestamp unixSeconds={repost.created_at} />
      </div>
      <div className="border-edge/70 mt-2 border-l-2 pl-3 sm:pl-4">
        {original ? (
          renderEvent(original, originalAuthor)
        ) : (
          <p className="text-ink-dim py-2 text-sm">
            Reposted an event that isn&apos;t indexed yet.
            {target.targetId ? (
              <>
                {" "}
                <Link
                  href={`/notes/${encodeURIComponent(target.targetId)}`}
                  className="text-link hover:text-link-hover"
                >
                  Open the original
                </Link>
              </>
            ) : null}
            {coordinate ? (
              <>
                {" "}
                <Link href={coordinateHref ?? "#"} className="text-link hover:text-link-hover">
                  {coordinate.kind}:{coordinate.pubkey.slice(0, 8)}…:{coordinate.identifier}
                </Link>
              </>
            ) : null}
          </p>
        )}
      </div>
    </article>
  );
}
