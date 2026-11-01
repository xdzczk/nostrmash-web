import Link from "@/components/app-link";

import { ProfileAvatar } from "@/components/explorer/profile-avatar";
import {
  profileHref,
  profileLabel,
  readTopZap,
  truncateProfileLabel,
} from "@/components/explorer/utils";
import type { Profile } from "@/lib/types/api";

const TEXT_SIZE = {
  sm: "text-[13px]",
  md: "text-sm",
} as const;

/** A smaller zap stays in the stat row. The citation starts at 21 sats. */
const CITATION_MIN_SATS = 21;
/** A message at this size leads, and the zapper becomes the caption. */
const PULL_QUOTE_MIN_SATS = 10_000;

/**
 * The largest zap on a post, when it is large enough to cite.
 * From 21 sats it is one line: name, amount, message.
 * From 10,000 sats a message leads as a pull quote.
 * Smaller zaps stay in the stat row.
 */
export function TopZap({
  source,
  className = "",
  size = "sm",
}: {
  source: unknown;
  className?: string;
  size?: keyof typeof TEXT_SIZE;
}) {
  const zap = readTopZap(source);
  if (!zap || zap.sats < CITATION_MIN_SATS) return null;

  const profile: Profile = {
    pubkey: zap.senderPubkey,
    ...(zap.name ? { name: zap.name } : {}),
    ...(zap.displayName ? { display_name: zap.displayName } : {}),
    ...(zap.picture ? { picture: zap.picture } : {}),
  };
  const href = profileHref(profile, zap.senderPubkey);
  if (!href) return null;

  const name = truncateProfileLabel(profileLabel(profile));
  const amount = `${zap.sats.toLocaleString()} sats`;
  const comment = zap.comment?.replace(/\s+/g, " ").trim();
  const label = comment
    ? `Top zap from ${name}, ${amount}: ${comment}`
    : `Top zap from ${name}, ${amount}`;
  const detail = size === "md";
  const avatar = detail ? 28 : 20;
  const pullQuote = Boolean(comment) && zap.sats >= PULL_QUOTE_MIN_SATS;
  const portrait = (
    <ProfileAvatar
      profile={profile}
      size={avatar}
      alt=""
      className={`${detail ? "size-7" : "size-5"} shrink-0 rounded-full object-cover`}
    />
  );

  return (
    <Link
      href={href}
      aria-label={label}
      title={label}
      data-top-zap={pullQuote ? "quote" : "line"}
      className={`${detail ? "mt-4" : "mt-1.5"} hover:text-ink flex w-full min-w-0 flex-col ${TEXT_SIZE[size]} ${className}`.trim()}
    >
      <span aria-hidden className="flex w-full min-w-0 flex-col gap-1.5">
        {pullQuote ? (
          <>
            <span className="text-ink line-clamp-2 text-[15px] leading-snug">{comment}</span>
            <span className="flex min-w-0 items-center gap-1.5">
              {portrait}
              <span className="text-ink min-w-0 truncate font-medium">{name}</span>
              <span className="text-ink-faint shrink-0">·</span>
              <span className="text-ink shrink-0 font-medium tabular-nums">{amount}</span>
            </span>
          </>
        ) : (
          <span className="flex min-w-0 items-center gap-1.5">
            {portrait}
            <span
              className={`text-ink min-w-0 truncate font-medium ${comment ? "max-w-[50%] shrink" : ""}`}
            >
              {name}
            </span>
            <span className="text-ink-faint shrink-0">·</span>
            <span className="text-ink shrink-0 font-medium tabular-nums">{amount}</span>
            {comment ? (
              <>
                <span className="text-ink-faint shrink-0">—</span>
                <span className="text-ink-dim min-w-0 flex-1 truncate">{comment}</span>
              </>
            ) : null}
          </span>
        )}
      </span>
    </Link>
  );
}
