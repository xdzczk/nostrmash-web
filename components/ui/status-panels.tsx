import { summarizeLoadErrors } from "@/lib/errors/user-message";

export function ErrorPanel({
  message,
  title = "Couldn’t load this section",
  detail,
}: {
  message: string;
  title?: string;
  /** Dev-only raw diagnostic (request ids, paths). Hidden in production. */
  detail?: string;
}) {
  const showDetail =
    process.env.NODE_ENV !== "production" && typeof detail === "string" && detail.trim().length > 0;

  return (
    <div
      role="alert"
      className="border-danger/40 bg-danger-soft text-danger-ink rounded-lg border p-3.5 text-sm break-words"
    >
      <p className="text-danger-ink font-medium">{title}</p>
      <p className="text-danger-ink/90 mt-1">{message}</p>
      {showDetail ? (
        <details className="border-danger/25 mt-2 rounded-md border px-2 py-1.5 text-xs opacity-80">
          <summary className="cursor-pointer select-none">Technical details</summary>
          <p className="mt-1.5 font-mono break-all">{detail}</p>
        </details>
      ) : null}
    </div>
  );
}

export function SoftRefreshNote({ message }: { message: string }) {
  return (
    <div
      role="status"
      className="border-warning/35 bg-warning-soft text-warning-ink rounded-lg border px-3.5 py-2.5 text-sm"
    >
      {message}
    </div>
  );
}

/** Consolidate loader error strings into one ErrorPanel, or render nothing. */
export function LoadErrors({ errors }: { errors: Array<string | undefined | null> }) {
  const message = summarizeLoadErrors(errors);
  if (!message) return null;
  return <ErrorPanel message={message} />;
}

export function JsonPanel({
  data,
  maxHeightClassName = "max-h-96",
}: {
  data: unknown;
  maxHeightClassName?: string;
}) {
  return (
    <pre
      className={`border-edge bg-surface-sunken text-ink-dim overflow-auto rounded-lg border p-3 text-xs ${maxHeightClassName}`}
    >
      {JSON.stringify(data, null, 2)}
    </pre>
  );
}
