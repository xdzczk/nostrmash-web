export function ConsistencyBadge({ consistency }: { consistency?: string }) {
  if (!consistency) return null;

  const normalized = consistency.toLowerCase();
  const tone =
    normalized === "strong"
      ? "border-success/40 bg-success-soft text-success-ink"
      : "border-warning/40 bg-warning-soft text-warning-ink";

  return (
    <span className={`rounded-full border px-2 py-1 text-xs ${tone}`}>
      consistency: {consistency}
    </span>
  );
}
