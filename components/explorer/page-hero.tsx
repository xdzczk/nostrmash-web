import type { ReactNode } from "react";

export function PageHero({
  title,
  subtitle,
  badges,
  actions,
}: {
  title: string;
  subtitle?: string;
  badges?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <section className="space-y-4 rounded-lg border border-zinc-800 bg-zinc-900/60 p-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-100">{title}</h1>
        {subtitle ? <p className="max-w-4xl text-sm text-zinc-300">{subtitle}</p> : null}
      </div>
      {badges ? <div className="flex flex-wrap items-center gap-2">{badges}</div> : null}
      {actions ? <div>{actions}</div> : null}
    </section>
  );
}
