import type { ReactNode } from "react";

import { PlainRemoteImage } from "@/components/ui/plain-remote-image";

export function PageHero({
  eyebrow,
  title,
  headline,
  subtitle,
  badges,
  actions,
  support,
  className,
  emphasize = false,
  compact = false,
  /** Tighter mobile padding. Discover uses this so the first row clears the fold. */
  dense = false,
  subtitleFromSm = false,
  icon,
  bannerSrc,
}: {
  eyebrow?: string;
  title: string;
  /** Replaces the text heading. The node should include its own h1. */
  headline?: ReactNode;
  subtitle?: string;
  badges?: ReactNode;
  actions?: ReactNode;
  support?: ReactNode;
  className?: string;
  emphasize?: boolean;
  /** Tighter vertical rhythm for detail pages where the content is the hero. */
  compact?: boolean;
  dense?: boolean;
  /** Show the subtitle from `sm` up only (phones get the title and tabs). */
  subtitleFromSm?: boolean;
  /** Small image beside the title. Hidden if it fails to load. */
  icon?: { src: string; alt: string };
  /** Modest strip under the hero. Hidden if it fails to load. */
  bannerSrc?: string;
}) {
  const padding = dense
    ? "space-y-2 pt-1 pb-3 sm:space-y-3.5 sm:pt-6 sm:pb-6"
    : compact
      ? "space-y-3 pt-1 pb-4 sm:pt-2 sm:pb-5"
      : emphasize
        ? "space-y-3.5 pt-5 pb-6 sm:pt-10 sm:pb-9"
        : "space-y-3.5 pt-5 pb-6 sm:pt-7 sm:pb-7";
  return (
    <section className={`nm-signal-rule border-edge/80 border-b ${padding} ${className ?? ""}`}>
      <div className="space-y-2">
        {eyebrow ? <p className="nm-kicker">{eyebrow}</p> : null}
        <div className="flex items-center gap-3">
          {icon ? (
            <PlainRemoteImage
              src={icon.src}
              alt={icon.alt}
              width={40}
              height={40}
              className="border-edge/80 size-10 shrink-0 rounded-sm border object-cover"
            />
          ) : null}
          {headline ?? (
            <h1
              className={`text-ink-strong min-w-0 ${emphasize ? "nm-display-xl" : "nm-display-lg"}`}
            >
              {title}
            </h1>
          )}
        </div>
        {subtitle ? (
          <p
            className={`text-ink-muted max-w-[46rem] text-[1.02rem] leading-7 ${
              subtitleFromSm ? "hidden sm:block" : ""
            }`}
          >
            {subtitle}
          </p>
        ) : null}
      </div>
      {badges ? (
        <div className={dense ? "min-w-0" : "flex flex-wrap items-center gap-2"}>{badges}</div>
      ) : null}
      {actions ? <div className="max-w-3xl">{actions}</div> : null}
      {support ? <div>{support}</div> : null}
      {bannerSrc ? (
        <PlainRemoteImage src={bannerSrc} alt="" className="h-32 w-full rounded-md object-cover" />
      ) : null}
    </section>
  );
}
