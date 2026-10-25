export function CheckComposition({
  fresh,
  stale,
  failing,
  unknown,
  hosts,
}: {
  fresh: number;
  stale: number;
  failing: number;
  unknown: number;
  hosts?: number;
}) {
  const segments = [
    { id: "fresh", label: "Checked in today", value: fresh, bar: "bg-success" },
    { id: "stale", label: "Stale", value: stale, bar: "bg-warning" },
    { id: "failing", label: "Failing", value: failing, bar: "bg-danger" },
    { id: "unknown", label: "No status", value: unknown, bar: "bg-edge-strong" },
  ];
  const total = segments.reduce((sum, segment) => sum + segment.value, 0);
  if (total <= 0) return null;
  const visible = segments.filter((segment) => segment.value > 0);
  const summary = visible
    .map((segment) => `${segment.value.toLocaleString()} ${segment.label.toLowerCase()}`)
    .join(", ");

  return (
    <figure>
      <div
        className="bg-edge/80 flex h-2 overflow-hidden rounded-full"
        role="img"
        aria-label={`${total.toLocaleString()} ingest checks: ${summary}`}
      >
        {visible.map((segment) => (
          <div
            key={segment.id}
            className={`${segment.bar} h-full`}
            style={{ width: `${(segment.value / total) * 100}%` }}
          />
        ))}
      </div>
      <ul className="mt-4 grid gap-4 sm:grid-cols-3">
        {segments
          .filter((segment) => segment.id !== "unknown" || segment.value > 0)
          .map((segment) => (
            <li key={segment.id}>
              <p className="text-ink text-2xl font-semibold tracking-[-0.03em] tabular-nums">
                {segment.value.toLocaleString()}
              </p>
              <p className="text-ink-muted text-sm">{segment.label}</p>
            </li>
          ))}
      </ul>
      <figcaption className="text-ink-faint mt-3 text-xs">
        {total.toLocaleString()} ingest checks
        {hosts && hosts !== total ? ` across ${hosts.toLocaleString()} hosts` : ""}. A stale check
        is healthy, and older than a day.
      </figcaption>
    </figure>
  );
}
