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
    <div className="space-y-4">
      <div className="grid gap-2.5 text-sm sm:grid-cols-2">
        {links.map((entry) => (
          <Link
            key={entry.href}
            href={entry.href}
            className="rounded-lg border border-zinc-800 bg-zinc-900/45 p-3.5 transition hover:border-zinc-700 hover:bg-zinc-900/65"
          >
            <p className="text-sm font-medium text-zinc-100">{entry.label}</p>
            <p className="mt-1.5 text-xs leading-5 text-zinc-400">{entry.description}</p>
          </Link>
        ))}
      </div>
      <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
        {leadingSignals.map((signal) => (
          <div
            key={signal.label}
            className="rounded-lg border border-zinc-800/90 bg-zinc-950/55 p-3 text-xs text-zinc-300"
          >
            <p className="text-[11px] tracking-[0.14em] text-zinc-500 uppercase">{signal.label}</p>
            <p className="mt-1.5 truncate text-zinc-200">{signal.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
