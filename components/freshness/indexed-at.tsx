import { formatUpdatedRelative, isFreshTimestamp, parseTimestamp } from "@/lib/time/freshness";
import { getRequestNowMs } from "@/lib/time/request-now";

export function IndexedAt({
  computedAt,
  label = "Last indexed",
  nowMs,
}: {
  computedAt?: string | number | null;
  label?: string;
  nowMs?: number;
}) {
  if (computedAt == null || computedAt === "") return null;

  const date = parseTimestamp(computedAt);
  if (!date) return null;

  const now = typeof nowMs === "number" ? nowMs : getRequestNowMs();
  const isStale = !isFreshTimestamp(computedAt, now);
  const absolute = date.toLocaleString();
  const ageLabel = (formatUpdatedRelative(computedAt, now) ?? "Updated just now").replace(
    /^Updated\s+/,
    ""
  );

  if (isStale) {
    return (
      <p role="status" className="text-warning-ink text-xs" title={absolute}>
        <span className="bg-warning mr-1.5 inline-block h-1.5 w-1.5 rounded-full" />
        Index last updated {ageLabel}
      </p>
    );
  }

  return (
    <p className="text-ink-faint text-xs" title={absolute}>
      <span className="nm-live-dot bg-success mr-1.5 inline-block h-1.5 w-1.5 rounded-full" />
      {label} {ageLabel}
    </p>
  );
}
