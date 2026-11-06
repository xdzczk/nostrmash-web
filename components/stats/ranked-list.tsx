import type { ReactNode } from "react";

export function RankedList({
  items,
}: {
  items: Array<{
    id: string;
    entity: ReactNode;
    value: ReactNode;
    /** Compared with the leader to draw the bar. Omitted bars stay hidden. */
    amount?: number;
  }>;
}) {
  const max = Math.max(...items.map((item) => item.amount ?? 0), 1);
  return (
    <ol className="divide-edge/60 max-w-[40rem] divide-y">
      {items.map((item, index) => (
        <li
          key={item.id}
          className="grid grid-cols-[1.75rem_minmax(0,1fr)_auto] items-center gap-3 py-2.5"
        >
          <span className="text-ink-faint text-sm tabular-nums">{index + 1}</span>
          <div className="min-w-0">
            {item.entity}
            {typeof item.amount === "number" && item.amount > 0 ? (
              <span
                className="bg-accent/25 mt-1.5 block h-1 rounded-full"
                style={{ width: `${Math.max(8, (item.amount / max) * 100)}%` }}
              />
            ) : null}
          </div>
          <div className="text-ink text-sm tabular-nums">{item.value}</div>
        </li>
      ))}
    </ol>
  );
}

/** Label and value stay next to each other instead of stretching across the page. */
export function AdjacentValue({ label, value }: { label: ReactNode; value: ReactNode }) {
  return (
    <div className="flex max-w-[35rem] items-baseline gap-2 text-sm">
      <span className="text-ink-soft min-w-0">{label}</span>
      <span
        className="border-edge mb-[0.2rem] min-w-3 flex-1 border-b border-dotted"
        aria-hidden="true"
      />
      <span className="text-ink shrink-0 tabular-nums">{value}</span>
    </div>
  );
}
