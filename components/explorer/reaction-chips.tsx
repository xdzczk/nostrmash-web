import type { ReactionBreakdownItem } from "@/lib/types/api";

const SHORTCODE = /^:([A-Za-z0-9_+-]{1,64}):$/;
const VISIBLE = 3;

function chipLabel(content: string): string {
  const match = SHORTCODE.exec(content.trim());
  if (match?.[1]) return match[1];
  return content;
}

function chipName(content: string, count: number): string {
  const name = content === "+" ? "plus" : content === "-" ? "minus" : chipLabel(content);
  return `${name} ${count.toLocaleString()}`;
}

function ReactionMark({ item }: { item: ReactionBreakdownItem }) {
  const label = chipLabel(item.content);
  const image = item.emoji_url?.startsWith("https://") ? item.emoji_url : undefined;
  return (
    <span title={chipName(item.content, item.count)} className="inline-flex items-center gap-1">
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
}

/** Top reactions on one line. The rest open from “+N more”. */
export function ReactionChips({ items }: { items?: ReactionBreakdownItem[] }) {
  if (!items || items.length === 0) return null;
  const visible = items.slice(0, VISIBLE);
  const rest = items.slice(VISIBLE);
  return (
    <span className="text-ink-soft inline-flex flex-wrap items-center gap-x-2 gap-y-1">
      <span className="inline-flex flex-wrap items-center gap-x-2" aria-label="Reaction breakdown">
        {visible.map((item) => (
          <ReactionMark key={`${item.content}-${item.emoji_url ?? ""}`} item={item} />
        ))}
      </span>
      {rest.length > 0 ? (
        <details className="inline">
          <summary className="text-ink-muted cursor-pointer text-xs">+{rest.length} more</summary>
          <span className="mt-1 inline-flex flex-wrap items-center gap-x-2">
            {rest.map((item) => (
              <ReactionMark key={`${item.content}-${item.emoji_url ?? ""}`} item={item} />
            ))}
          </span>
        </details>
      ) : null}
    </span>
  );
}
