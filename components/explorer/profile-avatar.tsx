"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import {
  profileFallbackAvatarDataUrl,
  profileLabel,
  profilePictureUrl,
} from "@/components/explorer/utils";
import { EnlargeableImage } from "@/components/ui/image-lightbox";
import type { Profile } from "@/lib/types/api";

type ProfileAvatarProps = {
  profile: Profile;
  size: number;
  className?: string;
  alt?: string;
  /** When set, the avatar becomes a link to the profile page. */
  href?: string;
  /** Enlarge the remote photo in a lightbox. Ignored when `href` is set or the picture is a fallback. */
  enlarge?: boolean;
};

/**
 * Avatar for Nostr profiles. UGC picture hosts are unreliable, and Cloudflare
 * Images remotely transforms only a narrow set of widths (others 403), so we
 * skip the optimizer and fall back to a local gradient when the remote fails
 * or is incompatible with next/image remotePatterns (e.g. cleartext http hosts).
 */
export function ProfileAvatar({
  profile,
  size,
  className = "",
  alt,
  href,
  enlarge,
}: ProfileAvatarProps) {
  const fallbackSrc = profileFallbackAvatarDataUrl(profile);
  const remoteSrc = profilePictureUrl(profile);
  const [brokenRemote, setBrokenRemote] = useState<string | null>(null);
  const src = remoteSrc && brokenRemote !== remoteSrc ? remoteSrc : fallbackSrc;
  const label = alt ?? profileLabel(profile);
  const canEnlarge = Boolean(enlarge && !href && remoteSrc && brokenRemote !== remoteSrc);

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

  if (href) {
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

  if (canEnlarge && remoteSrc) {
    return (
      <EnlargeableImage
        src={remoteSrc}
        alt={label}
        label={label ? `Enlarge photo of ${label}` : "Enlarge photo"}
        className="nm-pressable focus-visible:ring-accent-soft/70 inline-flex shrink-0 cursor-zoom-in rounded-full focus-visible:ring-2 focus-visible:outline-none"
      >
        {image}
      </EnlargeableImage>
    );
  }

  return image;
}
