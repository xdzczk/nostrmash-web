export function ErrorPanel({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-red-900/55 bg-red-950/30 p-3.5 text-sm break-words text-red-200">
      {message}
    </div>
  );
}

export function EmptyPanel({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-zinc-800/95 bg-zinc-900/45 p-3.5 text-sm break-words text-zinc-300">
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
      className={`overflow-auto rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-xs text-zinc-300 ${maxHeightClassName}`}
    >
      {JSON.stringify(data, null, 2)}
    </pre>
  );
}
