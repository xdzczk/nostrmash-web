"use client";

import { useState } from "react";

/**
 * Short cropped profile cover. Decorative: the name lives in the heading.
 * Banner hosts are arbitrary, so this is a plain image — a failed load removes
 * the cover and the hero starts at the avatar.
 */
export function ProfileCover({ src }: { src: string }) {
  const [broken, setBroken] = useState(false);
  if (broken) return null;
  return (
    <div
      aria-hidden
      data-testid="profile-cover"
      className="border-edge relative h-20 overflow-hidden rounded-xl border sm:h-28"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        className="h-full w-full object-cover"
        onError={() => setBroken(true)}
      />
    </div>
  );
}
