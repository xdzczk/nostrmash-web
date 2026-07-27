export function ErrorPanel({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="rounded-lg border border-red-900/55 bg-red-950/30 p-3.5 text-sm break-words text-red-200"
    >
      {message}
    </div>
  );
}

export function EmptyPanel({ message }: { message: string }) {
  return (
    <div className="border-edge/95 bg-surface/45 text-ink-dim rounded-lg border p-3.5 text-sm break-words">
      {message}
    </div>
  );
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
