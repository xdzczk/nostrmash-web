import type { ReactNode } from "react";

/**
 * A calm, intentional empty state. When no `title` is given the `message`
 * becomes the primary line — so callers that pass a specific sentence (the
 * common case) read as one clear statement rather than a cold generic header
 * stacked on top of detail text.
 */
export function EmptyState({
  title,
  message,
  actions,
}: {
  title?: string;
  message: string;
  actions?: ReactNode;
}) {
  return (
    <div className="border-edge/70 bg-surface/20 flex flex-col items-center gap-3 rounded-xl border border-dashed px-5 py-9 text-center">
      <span
        aria-hidden
        className="border-edge-strong/60 bg-surface-sunken/40 inline-flex h-11 w-11 items-center justify-center rounded-full border"
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
        {title ? (
          <>
            <p className="text-ink text-sm font-medium">{title}</p>
            <p className="text-ink-muted mx-auto max-w-md text-sm leading-6">{message}</p>
          </>
        ) : (
          <p className="text-ink-dim mx-auto max-w-md text-sm leading-6">{message}</p>
        )}
      </div>
      {actions ? <div className="mt-1">{actions}</div> : null}
    </div>
  );
}
