/** Bar length against a leader, so the top of a ranking fills the track. */
export function ShareBar({ value, max, label }: { value: number; max: number; label: string }) {
  const ratio = max > 0 ? Math.min(Math.max(value / max, 0), 1) : 0;
  const width = ratio === 0 ? 0 : Math.max(ratio * 100, 1.5);

  return (
    <div
      className="bg-edge/80 mt-1 h-1.5 w-full overflow-hidden rounded-full"
      role="img"
      aria-label={label}
    >
      <div className="bg-accent/70 h-full rounded-full" style={{ width: `${width}%` }} />
    </div>
  );
}
