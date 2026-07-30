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
    <div className="border-edge/65 flex flex-col items-center gap-4 border-y px-5 py-12 text-center sm:py-16">
      <span aria-hidden className="inline-flex h-9 w-9 items-center justify-center">
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
      <div className="space-y-2">
        {title ? (
          <>
            <p className="nm-title text-ink">{title}</p>
            <p className="text-ink-muted mx-auto max-w-md text-[15px] leading-6">{message}</p>
          </>
        ) : (
          <p className="text-ink-dim mx-auto max-w-md text-[15px] leading-6">{message}</p>
        )}
      </div>
      {actions ? <div className="mt-1">{actions}</div> : null}
    </div>
  );
}
