import type { ReactNode } from "react";

export function EmptyState({
  title = "No data available",
  message,
  actions,
}: {
  title?: string;
  message: string;
  actions?: ReactNode;
}) {
  return (
    <div className="border-edge/80 bg-surface/25 flex flex-col items-center gap-3 rounded-xl border px-5 py-8 text-center">
      <span
        aria-hidden
        className="border-edge-strong/70 bg-surface-sunken/40 inline-flex h-11 w-11 items-center justify-center rounded-full border"
      >
        <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
          <circle cx="12" cy="12" r="2.5" className="fill-accent-soft" opacity={0.9} />
          <circle
            cx="12"
            cy="12"
            r="6"
            className="stroke-accent-soft"
            strokeWidth="1.2"
            opacity={0.4}
          />
          <circle
            cx="12"
            cy="12"
            r="9.5"
            className="stroke-accent-soft"
            strokeWidth="1.2"
            opacity={0.18}
          />
        </svg>
      </span>
      <div className="space-y-1">
        <p className="text-ink text-sm font-medium">{title}</p>
        <p className="text-ink-muted mx-auto max-w-md text-sm leading-6">{message}</p>
      </div>
      {actions ? <div className="mt-1">{actions}</div> : null}
    </div>
  );
}
