import type { ReactNode } from "react";

export function PageHero({
  eyebrow,
  title,
  subtitle,
  badges,
  actions,
  support,
  className,
  emphasize = false,
  compact = false,
  subtitleFromSm = false,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  badges?: ReactNode;
  actions?: ReactNode;
  support?: ReactNode;
  className?: string;
  emphasize?: boolean;
  /** Tighter vertical rhythm for detail pages where the content is the hero. */
  compact?: boolean;
  /** Show the subtitle from `sm` up only (phones get the title and tabs). */
  subtitleFromSm?: boolean;
}) {
  const padding = compact
    ? "space-y-3 pt-1 pb-4 sm:pt-2 sm:pb-5"
    : emphasize
      ? "space-y-3.5 pt-5 pb-6 sm:pt-10 sm:pb-9"
      : "space-y-3.5 pt-5 pb-6 sm:pt-7 sm:pb-7";
  return (
    <section className={`nm-signal-rule border-edge/80 border-b ${padding} ${className ?? ""}`}>
      <div className="space-y-2">
        {eyebrow ? <p className="nm-kicker">{eyebrow}</p> : null}
        <h1 className={`text-ink-strong ${emphasize ? "nm-display-xl" : "nm-display-lg"}`}>
          {title}
        </h1>
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
      {badges ? <div className="flex flex-wrap items-center gap-2">{badges}</div> : null}
      {actions ? <div className="max-w-3xl">{actions}</div> : null}
      {support ? <div>{support}</div> : null}
    </section>
  );
}
