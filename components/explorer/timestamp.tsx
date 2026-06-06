export function Timestamp({
  unixSeconds,
  isoString,
  className = "",
}: {
  unixSeconds?: number;
  isoString?: string;
  className?: string;
}) {
  let date: Date | null = null;
  if (typeof unixSeconds === "number" && Number.isFinite(unixSeconds)) {
    date = new Date(unixSeconds * 1000);
  } else if (typeof isoString === "string" && isoString.length > 0) {
    const parsed = new Date(isoString);
    if (!Number.isNaN(parsed.getTime())) {
      date = parsed;
    }
  }

  if (!date) {
    return <span className={`text-ink-faint ${className}`}>time unknown</span>;
  }

  return (
    <time dateTime={date.toISOString()} className={`text-ink-muted ${className}`}>
      {date.toLocaleString()}
    </time>
  );
}
