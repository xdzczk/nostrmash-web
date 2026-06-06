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
      className={`border-edge/50 bg-surface/50 nm-raised space-y-4 rounded-2xl border p-4 sm:space-y-5 sm:p-6 ${
        emphasize ? "ring-edge-strong/40 ring-1" : ""
      } ${className ?? ""}`}
    >
      <div className="space-y-2">
        {eyebrow ? (
          <p className="text-ink-faint text-[11px] font-medium tracking-[0.18em] uppercase">
            {eyebrow}
          </p>
        ) : null}
        <h1
          className={`text-ink font-semibold tracking-tight ${
            emphasize ? "text-[1.85rem] sm:text-[2.1rem]" : "text-[1.75rem] sm:text-2xl"
          }`}
        >
          {title}
        </h1>
        {subtitle ? (
          <p className="text-ink-dim max-w-4xl text-sm leading-5 sm:text-[0.95rem] sm:leading-6">
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
