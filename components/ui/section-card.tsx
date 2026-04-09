import type { ReactNode } from "react";

export function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-zinc-800/95 bg-zinc-900/55 p-4 sm:p-5">
      <header className="mb-4 space-y-1">
        <h2 className="text-lg font-semibold tracking-tight text-zinc-100 sm:text-[1.1rem]">
          {title}
        </h2>
        {description ? <p className="text-sm leading-6 text-zinc-400">{description}</p> : null}
      </header>
      {children}
    </section>
  );
}
