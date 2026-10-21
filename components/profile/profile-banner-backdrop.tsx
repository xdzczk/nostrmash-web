"use client";

import Image from "next/image";
import { useState } from "react";

/**
 * Low-opacity, blurred profile banner behind the hero. Purely decorative:
 * aria-hidden, no pointer events, and it removes itself if the UGC host fails
 * so a broken image never leaves a visible artefact. The gradient fades the
 * banner into the page background so hero text keeps its contrast.
 */
export function ProfileBannerBackdrop({ src }: { src: string }) {
  const [broken, setBroken] = useState(false);
  if (broken) return null;

  return (
    <div
      aria-hidden
      data-testid="profile-banner-backdrop"
      className="pointer-events-none absolute -inset-x-4 top-0 -z-10 h-[min(22rem,70%)] overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_14%,black_86%,transparent)] select-none sm:-inset-x-6 lg:-inset-x-8"
    >
      <Image
        src={src}
        alt=""
        fill
        unoptimized
        sizes="100vw"
        className="scale-110 object-cover opacity-20 blur-2xl saturate-[0.85]"
        onError={() => setBroken(true)}
      />
      <div className="from-background/20 via-background/70 to-background absolute inset-0 bg-gradient-to-b" />
    </div>
  );
}
