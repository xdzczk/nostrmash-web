import Link from "next/link";

import { ProfileAvatar } from "@/components/explorer/profile-avatar";
import { ZapIcon } from "@/components/explorer/post-engagement";
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

/**
 * The largest zap on a post: who sent it, how much, and their message.
 * That line is the zapvertisement. Notes with no zap omit it.
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
  if (!zap) return null;

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
  const avatar = size === "md" ? 18 : 16;

  return (
    <Link
      href={href}
      aria-label={label}
      title={label}
      data-top-zap
      className={`hover:text-ink mt-1.5 inline-flex max-w-full min-w-0 items-start gap-1.5 ${TEXT_SIZE[size]} ${className}`.trim()}
    >
      <span aria-hidden className="inline-flex min-w-0 flex-col gap-0.5">
        <span className="inline-flex min-w-0 items-center gap-1.5">
          <span className="text-ink-faint inline-flex shrink-0">
            <ZapIcon />
          </span>
          <ProfileAvatar
            profile={profile}
            size={avatar}
            alt=""
            className={`${avatar === 18 ? "size-[18px]" : "size-4"} shrink-0 rounded-full object-cover`}
          />
          <span className="text-ink truncate font-medium">{name}</span>
          <span className="text-ink-faint shrink-0">·</span>
          <span className="text-ink-soft shrink-0 font-medium tabular-nums">{amount}</span>
        </span>
        {comment ? <span className="text-ink-dim line-clamp-2">{comment}</span> : null}
      </span>
    </Link>
  );
}
