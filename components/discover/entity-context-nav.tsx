import Link from "next/link";

import { discoverViewHref, discoverViewLabel, type DiscoverView } from "@/lib/discover/views";

export function EntityContextNav({
  view,
  parentHref,
  parentLabel,
  compact = false,
}: {
  view: Exclude<DiscoverView, "overview">;
  parentHref?: string;
  parentLabel?: string;
  /**
   * Render only the "Back to {label}" link. Use on entity pages whose hero
   * already carries the page context so the nav does not push content below
   * the fold.
   */
  compact?: boolean;
}) {
  const href = parentHref ?? discoverViewHref(view);
  const label = parentLabel ?? discoverViewLabel(view);

  if (compact) {
    return (
      <nav aria-label="Discovery context" className="text-ink-muted text-xs">
        <Link
          href={href}
          className="hover:text-ink inline-flex min-h-10 items-center font-medium sm:min-h-8"
        >
          <span aria-hidden className="mr-2">
            ←
          </span>
          Back to {label}
        </Link>
      </nav>
    );
  }

  return (
    <nav
      aria-label="Discovery context"
      className="border-edge/70 text-ink-muted -mx-4 overflow-x-auto border-y px-4 py-1 text-xs whitespace-nowrap [scrollbar-width:none] sm:mx-0 sm:px-0 sm:py-2 [&::-webkit-scrollbar]:hidden"
    >
      <ol className="flex items-center gap-x-3">
        <li>
          <Link
            href={href}
            className="hover:text-ink inline-flex min-h-10 items-center font-medium sm:min-h-9"
          >
            <span aria-hidden className="mr-2">
              ←
            </span>
            Back to {label}
          </Link>
        </li>
        <li aria-hidden className="text-edge-strong">
          /
        </li>
        <li>
          <Link href="/" className="hover:text-ink inline-flex min-h-10 items-center sm:min-h-9">
            Discover
          </Link>
        </li>
        <li aria-hidden className="text-edge-strong">
          /
        </li>
        <li>
          <Link
            href="/methodology"
            className="hover:text-ink inline-flex min-h-10 items-center sm:min-h-9"
          >
            Methodology
          </Link>
        </li>
      </ol>
    </nav>
  );
}
