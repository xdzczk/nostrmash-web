import { JsonPanel } from "@/components/ui/status-panels";

export function DebugDisclosure({
  title = "Debug payload",
  data,
  defaultOpen = false,
}: {
  title?: string;
  data: unknown;
  defaultOpen?: boolean;
}) {
  return (
    <details
      className="border-edge/80 bg-surface-sunken/40 text-ink-muted rounded-lg border p-3 text-xs"
      open={defaultOpen}
    >
      <summary className="text-ink-dim cursor-pointer text-sm select-none">{title}</summary>
      <div className="mt-3">
        <JsonPanel data={data} maxHeightClassName="max-h-80" />
      </div>
    </details>
  );
}
