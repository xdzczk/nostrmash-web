import Link from "next/link";

type QuickLink = {
  href: string;
  label: string;
  description: string;
};

type LeadingSignal = {
  label: string;
  value: string;
};

export function QuickEntryGrid({
  links,
  leadingSignals = [],
}: {
  links: QuickLink[];
  leadingSignals?: LeadingSignal[];
}) {
  return (
    <div className="space-y-3.5 sm:space-y-4">
      {links.length > 0 ? (
        <div className="grid gap-2 text-sm sm:grid-cols-2 sm:gap-2.5">
          {links.map((entry) => (
            <Link
              key={entry.href}
              href={entry.href}
              className="border-edge bg-surface/45 hover:border-edge-strong hover:bg-surface/65 rounded-lg border p-3 transition sm:p-3.5"
            >
              <p className="text-ink text-sm font-medium">{entry.label}</p>
              <p className="text-ink-muted mt-1 text-xs leading-5 sm:mt-1.5">{entry.description}</p>
            </Link>
          ))}
        </div>
      ) : null}
      {leadingSignals.length > 0 ? (
        <div className="grid gap-2 sm:grid-cols-2 sm:gap-2.5 lg:grid-cols-4">
          {leadingSignals.map((signal) => (
            <div
              key={signal.label}
              className="border-edge/90 bg-surface-sunken/55 text-ink-dim rounded-lg border p-2.5 text-xs sm:p-3"
            >
              <p className="text-ink-faint text-[11px]">{signal.label}</p>
              <p className="text-ink-soft mt-1.5 truncate">{signal.value}</p>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
