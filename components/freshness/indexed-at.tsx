import { getRequestNowMs } from "@/lib/time/request-now";

const STALE_AFTER_MS = 30 * 60 * 1000;

function parseComputedAt(computedAt: string | number): Date | null {
  if (typeof computedAt === "number" && Number.isFinite(computedAt)) {
    return new Date(computedAt * (computedAt < 1e12 ? 1000 : 1));
  }
  if (typeof computedAt === "string") {
    const parsed = Date.parse(computedAt);
    return Number.isFinite(parsed) ? new Date(parsed) : null;
  }
  return null;
}

function formatAge(date: Date, nowMs: number): string {
  const deltaMs = nowMs - date.getTime();
  if (deltaMs < 60_000) return "just now";
  const minutes = Math.round(deltaMs / 60_000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

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

  const date = parseComputedAt(computedAt);
  if (!date) return null;

  const now = typeof nowMs === "number" ? nowMs : getRequestNowMs();
  const ageMs = now - date.getTime();
  const isStale = ageMs > STALE_AFTER_MS;
  const absolute = date.toLocaleString();
  const ageLabel = formatAge(date, now);

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
