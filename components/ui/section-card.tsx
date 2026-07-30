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
    <section className="border-edge/70 border-t py-6 sm:py-8">
      <header className="mb-5 max-w-3xl space-y-2 sm:mb-6">
        <h2 className="nm-title text-ink">{title}</h2>
        {description ? <p className="text-ink-muted text-[15px] leading-6">{description}</p> : null}
      </header>
      {children}
    </section>
  );
}
