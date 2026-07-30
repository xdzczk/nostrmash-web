import type { ReactNode } from "react";

/** General-purpose collapsible section for consumer pages (not debug-gated). */
export function Disclosure({
  title,
  description,
  children,
  defaultOpen = false,
  id,
  className = "",
}: {
  title: string;
  description?: string;
  children: ReactNode;
  defaultOpen?: boolean;
  id?: string;
  className?: string;
}) {
  return (
    <details
      id={id}
      open={defaultOpen || undefined}
      className={`border-edge/80 bg-surface/35 group rounded-xl border px-4 py-3 ${className}`}
    >
      <summary className="text-ink-soft focus-visible:ring-accent-soft/70 cursor-pointer list-none rounded-md font-medium outline-none marker:content-none focus-visible:ring-2 [&::-webkit-details-marker]:hidden">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm">{title}</p>
            {description ? <p className="text-ink-faint mt-0.5 text-xs">{description}</p> : null}
          </div>
          <span className="text-ink-faint text-xs transition group-open:rotate-180">▾</span>
        </div>
      </summary>
      <div className="border-edge/60 mt-3 border-t pt-3">{children}</div>
    </details>
  );
}
