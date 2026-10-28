"use client";

import { useBlossomImageSrc } from "@/hooks/use-blossom-image-src";

/**
 * Short cropped profile cover. Decorative: the name lives in the heading.
 * Banner hosts are arbitrary, so this is a plain image. A failed Blossom blob
 * is retried on other public servers; when every candidate fails, the cover
 * is removed and the hero starts at the avatar.
 */
export function ProfileCover({ src }: { src: string }) {
  const image = useBlossomImageSrc(src);
  if (!image.src || image.failed) return null;
  return (
    <div
      aria-hidden
      data-testid="profile-cover"
      className="border-edge relative h-20 overflow-hidden rounded-xl border sm:h-28"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={image.src}
        alt=""
        className="h-full w-full object-cover"
        onError={image.onError}
        onLoad={image.onLoad}
      />
    </div>
  );
}
