import { JsonPanel } from "@/components/ui/status-panels";

// Raw API payload inspectors are a development aid, not production UI. They are
// suppressed in production builds unless explicitly opted in via
// NEXT_PUBLIC_DEBUG_PANELS=1, so the public site never shows dev artifacts.
const SHOW_DEBUG =
  process.env.NODE_ENV !== "production" || process.env.NEXT_PUBLIC_DEBUG_PANELS === "1";

export function DebugDisclosure({
  title = "Debug payload",
  data,
  defaultOpen = false,
}: {
  title?: string;
  data: unknown;
  defaultOpen?: boolean;
}) {
  if (!SHOW_DEBUG) return null;

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
