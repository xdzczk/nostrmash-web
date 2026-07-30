"use client";

import Image from "next/image";
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
};

/**
 * Avatar for Nostr profiles. UGC picture hosts are unreliable, and Cloudflare
 * Images remotely transforms only a narrow set of widths (others 403), so we
 * skip the optimizer and fall back to a local gradient when the remote fails.
 */
export function ProfileAvatar({ profile, size, className = "", alt }: ProfileAvatarProps) {
  const fallbackSrc = profileFallbackAvatarDataUrl(profile);
  const remoteSrc = profilePictureUrl(profile);
  const [brokenRemote, setBrokenRemote] = useState<string | null>(null);
  const src = remoteSrc && brokenRemote !== remoteSrc ? remoteSrc : fallbackSrc;
  const label = alt ?? profileLabel(profile);

  return (
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
}
