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
    <section className="border-edge/95 bg-surface/55 rounded-xl border p-3.5 sm:p-5">
      <header className="mb-3 space-y-1 sm:mb-4">
        <h2 className="text-ink text-base font-semibold tracking-tight sm:text-[1.1rem]">
          {title}
        </h2>
        {description ? (
          <p className="text-ink-muted text-sm leading-5 sm:leading-6">{description}</p>
        ) : null}
      </header>
      {children}
    </section>
  );
}
