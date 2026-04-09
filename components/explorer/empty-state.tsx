import type { ReactNode } from "react";

export function EmptyState({
  title = "No data available",
  message,
  actions,
}: {
  title?: string;
  message: string;
  actions?: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-zinc-800/80 bg-zinc-900/25 p-4">
      <p className="text-sm font-medium text-zinc-200">{title}</p>
      <p className="mt-1 text-sm leading-6 text-zinc-400">{message}</p>
      {actions ? <div className="mt-3">{actions}</div> : null}
    </div>
  );
}
