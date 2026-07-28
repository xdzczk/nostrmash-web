export function IndexedAt({
  computedAt,
  label = "Last indexed",
}: {
  computedAt?: string | number | null;
  label?: string;
}) {
  if (computedAt == null || computedAt === "") return null;

  let display = "";
  if (typeof computedAt === "number" && Number.isFinite(computedAt)) {
    display = new Date(computedAt * (computedAt < 1e12 ? 1000 : 1)).toLocaleString();
  } else if (typeof computedAt === "string") {
    const parsed = Date.parse(computedAt);
    display = Number.isFinite(parsed) ? new Date(parsed).toLocaleString() : computedAt;
  }
  if (!display) return null;

  return (
    <p className="text-ink-faint text-xs">
      <span className="nm-live-dot mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
      {label} {display}
    </p>
  );
}
