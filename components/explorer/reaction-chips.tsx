import type { ReactionBreakdownItem } from "@/lib/types/api";

const SHORTCODE = /^:([A-Za-z0-9_+-]{1,64}):$/;

function chipLabel(content: string): string {
  const match = SHORTCODE.exec(content.trim());
  if (match?.[1]) return match[1];
  return content;
}

function chipName(content: string, count: number): string {
  const name = content === "+" ? "plus" : content === "-" ? "minus" : chipLabel(content);
  return `${name} ${count.toLocaleString()}`;
}

/** Emoji and short reaction labels beside a reaction count. Empty lists render nothing. */
export function ReactionChips({ items }: { items?: ReactionBreakdownItem[] }) {
  if (!items || items.length === 0) return null;
  return (
    <span className="inline-flex flex-wrap items-center gap-1" aria-label="Reaction breakdown">
      {items.map((item) => {
        const label = chipLabel(item.content);
        const image = item.emoji_url?.startsWith("https://") ? item.emoji_url : undefined;
        return (
          <span
            key={`${item.content}-${image ?? ""}`}
            title={chipName(item.content, item.count)}
            className="border-edge text-ink-soft inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] leading-none"
          >
            {image ? (
              // Custom emoji are remote NIP-30 images. The shortcode stays in the accessible name.
              // eslint-disable-next-line @next/next/no-img-element
              <img src={image} alt="" className="size-3.5" />
            ) : (
              <span>{label}</span>
            )}
            <span className="text-ink-faint tabular-nums">{item.count.toLocaleString()}</span>
          </span>
        );
      })}
    </span>
  );
}
