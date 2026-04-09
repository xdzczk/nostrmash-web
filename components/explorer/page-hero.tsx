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
      className={`space-y-5 rounded-xl border border-zinc-800/95 bg-zinc-900/55 p-5 sm:p-6 ${
        emphasize ? "shadow-[0_0_0_1px_rgba(63,63,70,0.34)]" : ""
      } ${className ?? ""}`}
    >
      <div className="space-y-2">
        {eyebrow ? (
          <p className="text-[11px] font-medium tracking-[0.18em] text-zinc-500 uppercase">
            {eyebrow}
          </p>
        ) : null}
        <h1
          className={`font-semibold tracking-tight text-zinc-100 ${
            emphasize ? "text-3xl sm:text-[2.1rem]" : "text-2xl"
          }`}
        >
          {title}
        </h1>
        {subtitle ? (
          <p className="max-w-4xl text-sm leading-6 text-zinc-300 sm:text-[0.95rem]">{subtitle}</p>
        ) : null}
      </div>
      {badges ? <div className="flex flex-wrap items-center gap-2">{badges}</div> : null}
      {actions ? <div className="max-w-3xl">{actions}</div> : null}
      {support ? <div>{support}</div> : null}
    </section>
  );
}
