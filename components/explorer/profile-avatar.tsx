"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import {
  profileFallbackAvatarDataUrl,
  profileLabel,
  profilePictureUrl,
} from "@/components/explorer/utils";
import type { Profile } from "@/lib/types/api";

type ProfileAvatarProps = {
  profile: Profile;
  size: number;
  className?: string;
  alt?: string;
  /** When set, the avatar becomes a link to the profile page. */
  href?: string;
};

/**
 * Avatar for Nostr profiles. UGC picture hosts are unreliable, and Cloudflare
 * Images remotely transforms only a narrow set of widths (others 403), so we
 * skip the optimizer and fall back to a local gradient when the remote fails
 * or is incompatible with next/image remotePatterns (e.g. cleartext http hosts).
 */
export function ProfileAvatar({ profile, size, className = "", alt, href }: ProfileAvatarProps) {
  const fallbackSrc = profileFallbackAvatarDataUrl(profile);
  const remoteSrc = profilePictureUrl(profile);
  const [brokenRemote, setBrokenRemote] = useState<string | null>(null);
  const src = remoteSrc && brokenRemote !== remoteSrc ? remoteSrc : fallbackSrc;
  const label = alt ?? profileLabel(profile);

  const image = (
    <Image
      src={src}
      alt={label}
      width={size}
      height={size}
      unoptimized
      className={className}
      onError={() => {
        if (remoteSrc) {
          setBrokenRemote(remoteSrc);
        }
      }}
    />
  );

  if (!href) return image;

  return (
    <Link
      href={href}
      className="nm-pressable focus-visible:ring-accent-soft/70 inline-flex shrink-0 rounded-full focus-visible:ring-2 focus-visible:outline-none"
      aria-label={label ? `View ${label}` : "View profile"}
    >
      {image}
    </Link>
  );
}
