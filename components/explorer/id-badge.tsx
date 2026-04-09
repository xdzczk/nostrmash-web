import { truncateMiddle } from "@/components/explorer/utils";

export function IdBadge({
  id,
  label = "ID",
  className = "",
}: {
  id: string;
  label?: string;
  className?: string;
}) {
  return (
    <span
      title={id}
      className={`inline-flex items-center gap-2 rounded-full border border-zinc-700 bg-zinc-900/80 px-2 py-1 text-[11px] text-zinc-300 ${className}`}
    >
      <span className="text-zinc-500">{label}</span>
      <code className="font-mono">{truncateMiddle(id)}</code>
    </span>
  );
}
