import Link from "next/link";

import { discoverViewHref, discoverViewLabel, type DiscoverView } from "@/lib/discover/views";

export function EntityContextNav({
  view,
  parentHref,
  parentLabel,
}: {
  view: Exclude<DiscoverView, "overview">;
  parentHref?: string;
  parentLabel?: string;
}) {
  const href = parentHref ?? discoverViewHref(view);
  const label = parentLabel ?? discoverViewLabel(view);

  return (
    <nav
      aria-label="Discovery context"
      className="border-edge/70 text-ink-muted flex flex-wrap items-center gap-x-3 gap-y-2 border-y py-3 text-xs"
    >
      <Link href={href} className="hover:text-ink inline-flex min-h-11 items-center font-medium">
        <span aria-hidden className="mr-2">
          ←
        </span>
        Back to {label}
      </Link>
      <span aria-hidden className="text-edge-strong">
        /
      </span>
      <Link href="/" className="hover:text-ink inline-flex min-h-11 items-center">
        Discover overview
      </Link>
      <span aria-hidden className="text-edge-strong">
        /
      </span>
      <Link href="/methodology" className="hover:text-ink inline-flex min-h-11 items-center">
        Ranking methodology
      </Link>
    </nav>
  );
}
