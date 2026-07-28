import Link from "next/link";

const footerLinks = [
  { href: "/methodology", label: "Methodology" },
  { href: "/stats", label: "Stats" },
  { href: "/feeds/trending-notes.xml", label: "Trending RSS" },
  { href: "/search", label: "Search" },
];

export function SiteFooter() {
  return (
    <footer className="border-edge/80 bg-surface-sunken/60 mt-auto border-t">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="space-y-1">
          <p className="text-ink-soft text-sm font-medium">NostrMash</p>
          <p className="text-ink-faint max-w-md text-xs leading-5">
            A public discovery index for notes, profiles, relays, and trends on Nostr.
          </p>
        </div>
        <nav aria-label="Footer" className="flex flex-wrap gap-x-4 gap-y-2 text-xs">
          {footerLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-ink-muted hover:text-ink focus-visible:ring-accent-soft/70 rounded-sm focus-visible:ring-2 focus-visible:outline-none"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
      <div className="border-edge/60 border-t">
        <p className="text-ink-faint mx-auto w-full max-w-6xl px-4 py-3 text-[11px] sm:px-6">
          Unlicense — public domain dedication. Interpret rankings via Methodology.
        </p>
      </div>
    </footer>
  );
}
