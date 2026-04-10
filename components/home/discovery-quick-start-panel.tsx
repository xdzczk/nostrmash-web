import Link from "next/link";

type QuickStartAction = {
  href: string;
  label: string;
  description: string;
};

type QuickStartMeta = {
  label: string;
  value: string;
};

export function DiscoveryQuickStartPanel({
  actions,
  metadata,
}: {
  actions: QuickStartAction[];
  metadata: QuickStartMeta[];
}) {
  return (
    <aside className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-3.5 sm:p-5">
      <p className="text-[11px] font-medium tracking-[0.2em] text-zinc-500 uppercase">
        Discovery quick start
      </p>
      <p className="mt-2 text-lg font-semibold tracking-tight text-zinc-100 sm:text-xl">
        Open a live surface in one click.
      </p>
      <p className="mt-1 text-sm leading-5 text-zinc-400">
        Jump into what is moving right now across notes, profiles, hashtags, relays, and raw events.
      </p>

      <div className="mt-3 space-y-2 sm:mt-4 sm:space-y-2.5">
        {actions.map((action) => (
          <Link
            key={`${action.href}-${action.label}`}
            href={action.href}
            className="block rounded-lg border border-zinc-800/90 bg-zinc-950/55 px-3 py-2 transition hover:border-zinc-700 hover:bg-zinc-900/70"
          >
            <p className="text-sm font-medium text-zinc-100">{action.label}</p>
            <p className="mt-1 text-xs leading-5 text-zinc-400">{action.description}</p>
          </Link>
        ))}
      </div>

      {metadata.length > 0 ? (
        <div className="mt-3 grid gap-2 sm:mt-4 sm:grid-cols-2">
          {metadata.map((item) => (
            <div
              key={item.label}
              className="rounded-lg border border-zinc-800/90 bg-zinc-950/45 px-2.5 py-2 text-xs text-zinc-300"
            >
              <p className="text-[11px] tracking-[0.14em] text-zinc-500 uppercase">{item.label}</p>
              <p className="mt-1 truncate text-zinc-200">{item.value}</p>
            </div>
          ))}
        </div>
      ) : null}
    </aside>
  );
}
