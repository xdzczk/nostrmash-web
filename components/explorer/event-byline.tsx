import Link from "next/link";

import { ProfileAvatar } from "@/components/explorer/profile-avatar";
import { Timestamp } from "@/components/explorer/timestamp";
import {
  noteAuthorIdentifier,
  noteInlineAuthorProfile,
  profileHref,
  profileLabel,
  truncateProfileLabel,
} from "@/components/explorer/utils";
import type { EventRecord, Profile } from "@/lib/types/api";

export function EventByline({
  event,
  author,
  showAuthor = true,
  timestamp,
}: {
  event: EventRecord;
  author?: Profile;
  showAuthor?: boolean;
  timestamp?: number;
}) {
  const resolved = author ?? noteInlineAuthorProfile(event);
  const label = resolved ? profileLabel(resolved) : noteAuthorIdentifier(event);
  const href = profileHref(resolved, typeof event.pubkey === "string" ? event.pubkey : undefined);
  const avatar =
    resolved ??
    (typeof event.pubkey === "string" && event.pubkey.length > 0 ? { pubkey: event.pubkey } : null);
  const when = timestamp ?? (typeof event.created_at === "number" ? event.created_at : undefined);

  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
      {showAuthor && avatar ? (
        <ProfileAvatar
          profile={avatar}
          size={24}
          alt={label}
          href={href}
          className="border-edge-strong h-6 w-6 rounded-full border object-cover"
        />
      ) : null}
      {showAuthor && href ? (
        <Link
          href={href}
          title={label}
          className="text-ink-soft hover:text-ink-strong max-w-[min(100%,16rem)] truncate font-medium hover:underline"
        >
          {truncateProfileLabel(label)}
        </Link>
      ) : showAuthor ? (
        <span className="text-ink-soft max-w-[min(100%,16rem)] truncate font-medium" title={label}>
          {truncateProfileLabel(label)}
        </span>
      ) : null}
      {showAuthor && when !== undefined ? (
        <span aria-hidden className="text-ink-faint/70">
          •
        </span>
      ) : null}
      {when !== undefined ? <Timestamp unixSeconds={when} /> : null}
    </div>
  );
}
