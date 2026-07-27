import Link from "next/link";
import { EmptyState } from "@/components/explorer/empty-state";

export default function NotFound() {
  return (
    <EmptyState
      title="Page not found"
      message="That URL is not part of the explorer. Try search, trends, or head back home."
      actions={
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Link
            href="/"
            className="nm-pressable focus-visible:ring-accent-soft/70 bg-accent hover:bg-accent-soft inline-flex min-h-11 items-center justify-center rounded-lg px-4 py-2 text-sm font-medium text-white focus-visible:ring-2 focus-visible:outline-none"
          >
            Home
          </Link>
          <Link
            href="/search"
            className="nm-pressable focus-visible:ring-accent-soft/70 border-edge-strong bg-surface/60 text-ink-soft hover:border-edge-strong/80 hover:bg-surface/80 inline-flex min-h-11 items-center justify-center rounded-lg border px-4 py-2 text-sm font-medium focus-visible:ring-2 focus-visible:outline-none"
          >
            Search
          </Link>
          <Link
            href="/trending"
            className="nm-pressable focus-visible:ring-accent-soft/70 text-ink-dim hover:bg-surface/60 hover:text-ink inline-flex min-h-11 items-center justify-center rounded-lg px-4 py-2 text-sm font-medium focus-visible:ring-2 focus-visible:outline-none"
          >
            Trends
          </Link>
        </div>
      }
    />
  );
}
