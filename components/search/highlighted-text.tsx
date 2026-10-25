import { splitHighlight } from "@/lib/search/highlight";

export function HighlightedText({ value, terms }: { value: string; terms?: string[] }) {
  const parts = splitHighlight(value, terms ?? []);
  return parts.map((part, index) =>
    part.match ? (
      <mark key={index} className="bg-accent/20 rounded-sm text-inherit">
        {part.text}
      </mark>
    ) : (
      <span key={index}>{part.text}</span>
    )
  );
}
