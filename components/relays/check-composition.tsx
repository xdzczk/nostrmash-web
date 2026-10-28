export function CheckComposition({
  reading,
  failing,
  unknown = 0,
  earlier,
  hosts,
}: {
  reading: number;
  failing: number;
  unknown?: number;
  earlier: number;
  hosts?: number;
}) {
  const current = reading + failing + unknown;
  const segments = [
    { id: "reading", label: "Checked in today", value: reading, bar: "bg-success" },
    { id: "failing", label: "Failing now", value: failing, bar: "bg-danger" },
    { id: "unknown", label: "No status", value: unknown, bar: "bg-edge-strong" },
  ];
  const visible = segments.filter((segment) => segment.value > 0);
  const summary = visible
    .map((segment) => `${segment.value.toLocaleString()} ${segment.label.toLowerCase()}`)
    .join(", ");
  const checks = reading + failing + unknown + earlier;
  const captionParts: string[] = [];
  if (earlier > 0) {
    captionParts.push(
      `${earlier.toLocaleString()} earlier ${earlier === 1 ? "check stays" : "checks stay"} on record.`
    );
  }
  if (hosts && hosts !== checks && checks > 0) {
    captionParts.push(`${checks.toLocaleString()} checks across ${hosts.toLocaleString()} hosts.`);
  }
  const caption = captionParts.join(" ");
  const figures = segments.filter((segment) => segment.id === "reading" || segment.value > 0);

  return (
    <figure>
      {current > 0 ? (
        <div
          className="bg-edge/80 flex h-2 overflow-hidden rounded-full"
          role="img"
          aria-label={`${current.toLocaleString()} relays in the current read: ${summary}`}
        >
          {visible.map((segment) => (
            <div
              key={segment.id}
              className={`${segment.bar} h-full`}
              style={{ width: `${(segment.value / current) * 100}%` }}
            />
          ))}
        </div>
      ) : null}
      <ul className="mt-4 flex flex-wrap gap-x-10 gap-y-4">
        {figures.map((segment) => (
          <li key={segment.id}>
            <p className="text-ink text-2xl font-semibold tracking-[-0.03em] tabular-nums">
              {segment.value.toLocaleString()}
            </p>
            <p className="text-ink-muted text-sm">{segment.label}</p>
          </li>
        ))}
      </ul>
      {caption ? <figcaption className="text-ink-faint mt-3 text-xs">{caption}</figcaption> : null}
    </figure>
  );
}
