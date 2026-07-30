import Link from "next/link";

const footerLinks = [
  { href: "/", label: "Discover" },
  { href: "/relays", label: "Network" },
  { href: "/methodology", label: "Methodology" },
  { href: "/feeds/trending-notes.xml", label: "Trending RSS" },
];

export function SiteFooter() {
  return (
    <footer className="border-edge/80 bg-surface-sunken/60 mt-auto border-t">
      <div className="mx-auto flex w-full max-w-[90rem] flex-col gap-6 px-4 py-10 sm:flex-row sm:items-end sm:justify-between sm:px-6 lg:px-8">
        <div className="space-y-1">
          <p className="text-ink-soft text-sm font-medium tracking-tight">NostrMash</p>
          <p className="text-ink-muted mt-2 max-w-md text-sm leading-6">
            Understand what is moving on Nostr—and why it matters.
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
        <p className="text-ink-faint mx-auto w-full max-w-[90rem] px-4 py-3 text-xs sm:px-6 lg:px-8">
          Unlicense — public domain dedication. Interpret rankings via Methodology.
        </p>
      </div>
    </footer>
  );
}
