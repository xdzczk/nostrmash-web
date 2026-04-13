import {
  truncateIdentifier,
  type IdentifierKind,
  type IdentifierSurface,
} from "@/components/explorer/utils";

export function IdBadge({
  id,
  label = "ID",
  kind = "event",
  surface = "secondary",
  className = "",
}: {
  id: string;
  label?: string;
  kind?: IdentifierKind;
  surface?: IdentifierSurface;
  className?: string;
}) {
  return (
    <span
      title={id}
      className={`inline-flex items-center gap-2 rounded-full border border-zinc-700 bg-zinc-900/80 px-2 py-1 text-[11px] text-zinc-300 ${className}`}
    >
      <span className="text-zinc-500">{label}</span>
      <code className="font-mono">{truncateIdentifier(id, kind, surface)}</code>
    </span>
  );
}
