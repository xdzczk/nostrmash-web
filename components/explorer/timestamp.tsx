import { getRequestNowMs } from "@/lib/time/request-now";

function resolveDate(unixSeconds?: number, isoString?: string): Date | null {
  if (typeof unixSeconds === "number" && Number.isFinite(unixSeconds)) {
    return new Date(unixSeconds * 1000);
  }
  if (typeof isoString === "string" && isoString.length > 0) {
    const parsed = new Date(isoString);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return null;
}

function formatRelativeTime(date: Date, nowMs: number): string {
  const deltaMs = date.getTime() - nowMs;
  const absSeconds = Math.round(Math.abs(deltaMs) / 1000);
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

  if (absSeconds < 60) return rtf.format(Math.round(deltaMs / 1000), "second");
  const absMinutes = Math.round(absSeconds / 60);
  if (absMinutes < 60) return rtf.format(Math.round(deltaMs / 60_000), "minute");
  const absHours = Math.round(absMinutes / 60);
  if (absHours < 48) return rtf.format(Math.round(deltaMs / 3_600_000), "hour");
  const absDays = Math.round(absHours / 24);
  if (absDays < 60) return rtf.format(Math.round(deltaMs / 86_400_000), "day");
  const absMonths = Math.round(absDays / 30);
  if (absMonths < 24) return rtf.format(Math.round(deltaMs / (86_400_000 * 30)), "month");
  return rtf.format(Math.round(deltaMs / (86_400_000 * 365)), "year");
}

export function Timestamp({
  unixSeconds,
  isoString,
  className = "",
  /** Override "now" for SSR-stable relative labels (defaults to Date.now()). */
  nowMs,
}: {
  unixSeconds?: number;
  isoString?: string;
  className?: string;
  nowMs?: number;
}) {
  const date = resolveDate(unixSeconds, isoString);

  if (!date) {
    return <span className={`text-ink-faint ${className}`}>time unknown</span>;
  }

  const absolute = date.toLocaleString();
  const relative = formatRelativeTime(date, typeof nowMs === "number" ? nowMs : getRequestNowMs());

  return (
    <time dateTime={date.toISOString()} title={absolute} className={`text-ink-muted ${className}`}>
      {relative}
    </time>
  );
}
