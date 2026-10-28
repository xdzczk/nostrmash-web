"use client";

import Image from "next/image";
import Link from "next/link";

import {
  profileFallbackAvatarDataUrl,
  profileLabel,
  profilePictureUrl,
} from "@/components/explorer/utils";
import { EnlargeableImage } from "@/components/ui/image-lightbox";
import { useBlossomImageSrc } from "@/hooks/use-blossom-image-src";
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
  /** Eager-load. Set on the profile hero, which is the largest image on that page. */
  priority?: boolean;
};

/**
 * Avatar for Nostr profiles. Picture hosts are unreliable, and next/image only
 * optimizes a narrow set of widths, so this skips the optimizer. A failed
 * Blossom blob is retried on other public servers that store the same sha256.
 * When every candidate fails — or the URL cannot be loaded, such as cleartext
 * http — the local letter gradient is shown.
 */
export function ProfileAvatar({
  profile,
  size,
  className = "",
  alt,
  href,
  enlarge,
  priority = false,
}: ProfileAvatarProps) {
  const fallbackSrc = profileFallbackAvatarDataUrl(profile);
  const remoteSrc = profilePictureUrl(profile);
  const remote = useBlossomImageSrc(remoteSrc);
  const showingRemote = Boolean(remoteSrc && remote.src && !remote.failed);
  const src = showingRemote && remote.src ? remote.src : fallbackSrc;
  const label = alt ?? profileLabel(profile);
  const canEnlarge = Boolean(enlarge && !href && showingRemote);

  const image = (
    <Image
      src={src}
      alt={label}
      width={size}
      height={size}
      unoptimized
      priority={priority}
      loading={priority ? "eager" : undefined}
      fetchPriority={priority ? "high" : undefined}
      className={className}
      onError={showingRemote ? remote.onError : undefined}
      onLoad={showingRemote ? remote.onLoad : undefined}
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

  if (canEnlarge && remote.src) {
    return (
      <EnlargeableImage
        src={remote.src}
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
