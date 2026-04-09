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
      className="rounded-lg border border-zinc-800/80 bg-zinc-950/40 p-3 text-xs text-zinc-400"
      open={defaultOpen}
    >
      <summary className="cursor-pointer text-sm text-zinc-300 select-none">{title}</summary>
      <div className="mt-3">
        <JsonPanel data={data} maxHeightClassName="max-h-80" />
      </div>
    </details>
  );
}
