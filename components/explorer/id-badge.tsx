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
      className={`border-edge-strong bg-surface/80 text-ink-dim inline-flex min-h-6 items-center gap-2 rounded-full border px-2 py-0.5 text-xs ${className}`}
    >
      <span className="text-ink-faint">{label}</span>
      <code className="font-mono">{truncateIdentifier(id, kind, surface)}</code>
    </span>
  );
}
