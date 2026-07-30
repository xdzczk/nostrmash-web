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
      className={`nm-signal-rule border-edge/70 space-y-5 border-b pt-8 pb-9 sm:pt-12 sm:pb-12 ${
        emphasize ? "sm:pt-14 sm:pb-14" : ""
      } ${className ?? ""}`}
    >
      <div className="space-y-2">
        {eyebrow ? <p className="nm-kicker">{eyebrow}</p> : null}
        <h1 className={`text-ink-strong ${emphasize ? "nm-display-xl" : "nm-display-lg"}`}>
          {title}
        </h1>
        {subtitle ? (
          <p className="text-ink-muted max-w-3xl text-base leading-7">{subtitle}</p>
        ) : null}
      </div>
      {badges ? <div className="flex flex-wrap items-center gap-2">{badges}</div> : null}
      {actions ? <div className="max-w-3xl">{actions}</div> : null}
      {support ? <div>{support}</div> : null}
    </section>
  );
}
