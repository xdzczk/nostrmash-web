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
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  badges?: ReactNode;
  actions?: ReactNode;
  support?: ReactNode;
  className?: string;
  emphasize?: boolean;
}) {
  return (
    <section
      className={`nm-signal-rule border-edge/80 space-y-4 border-b pt-7 pb-8 sm:pt-10 sm:pb-10 ${
        emphasize ? "sm:pt-12 sm:pb-11" : ""
      } ${className ?? ""}`}
    >
      <div className="space-y-2.5">
        {eyebrow ? <p className="nm-kicker">{eyebrow}</p> : null}
        <h1 className={`text-ink-strong ${emphasize ? "nm-display-xl" : "nm-display-lg"}`}>
          {title}
        </h1>
        {subtitle ? (
          <p className="text-ink-muted max-w-[46rem] text-[1.02rem] leading-7">{subtitle}</p>
        ) : null}
      </div>
      {badges ? <div className="flex flex-wrap items-center gap-2">{badges}</div> : null}
      {actions ? <div className="max-w-3xl">{actions}</div> : null}
      {support ? <div>{support}</div> : null}
    </section>
  );
}
