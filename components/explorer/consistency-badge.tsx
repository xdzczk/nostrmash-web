export function ConsistencyBadge({ consistency }: { consistency?: string }) {
  if (!consistency) return null;

  const normalized = consistency.toLowerCase();
  const tone =
    normalized === "strong"
      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
      : "border-amber-500/40 bg-amber-500/10 text-amber-300";

  return (
    <span className={`rounded-full border px-2 py-1 text-xs ${tone}`}>
      consistency: {consistency}
    </span>
  );
}
