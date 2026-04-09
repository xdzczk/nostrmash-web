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
  leadingSignals,
}: {
  links: QuickLink[];
  leadingSignals: LeadingSignal[];
}) {
  return (
    <div className="space-y-3.5 sm:space-y-4">
      <div className="grid gap-2 text-sm sm:grid-cols-2 sm:gap-2.5">
        {links.map((entry) => (
          <Link
            key={entry.href}
            href={entry.href}
            className="rounded-lg border border-zinc-800 bg-zinc-900/45 p-3 transition hover:border-zinc-700 hover:bg-zinc-900/65 sm:p-3.5"
          >
            <p className="text-sm font-medium text-zinc-100">{entry.label}</p>
            <p className="mt-1 text-xs leading-5 text-zinc-400 sm:mt-1.5">{entry.description}</p>
          </Link>
        ))}
      </div>
      <div className="grid gap-2 sm:grid-cols-2 sm:gap-2.5 lg:grid-cols-4">
        {leadingSignals.map((signal) => (
          <div
            key={signal.label}
            className="rounded-lg border border-zinc-800/90 bg-zinc-950/55 p-2.5 text-xs text-zinc-300 sm:p-3"
          >
            <p className="text-[11px] tracking-[0.14em] text-zinc-500 uppercase">{signal.label}</p>
            <p className="mt-1.5 truncate text-zinc-200">{signal.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
