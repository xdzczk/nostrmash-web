import type { ReactionBreakdownItem } from "@/lib/types/api";

function chipName(content: string, count: number): string {
  const name = content === "+" ? "plus" : content === "-" ? "minus" : content;
  return `${name} ${count.toLocaleString()}`;
}

/** Emoji and short reaction labels beside a reaction count. Empty lists render nothing. */
export function ReactionChips({ items }: { items?: ReactionBreakdownItem[] }) {
  if (!items || items.length === 0) return null;
  return (
    <span className="inline-flex flex-wrap items-center gap-1" aria-label="Reaction breakdown">
      {items.map((item) => (
        <span
          key={item.content}
          title={chipName(item.content, item.count)}
          className="border-edge text-ink-soft inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] leading-none"
        >
          <span>{item.content}</span>
          <span className="text-ink-faint tabular-nums">{item.count.toLocaleString()}</span>
        </span>
      ))}
    </span>
  );
}
