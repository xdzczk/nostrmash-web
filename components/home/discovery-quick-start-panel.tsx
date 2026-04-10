import Link from "next/link";

type QuickStartAction = {
  href: string;
  label: string;
  description?: string;
};

export function DiscoveryQuickStartPanel({
  actions,
  footerText,
}: {
  actions: QuickStartAction[];
  footerText?: string;
}) {
  return (
    <aside className="rounded-xl border border-zinc-800 bg-zinc-900/35 p-3.5 sm:p-4">
      <p className="text-[11px] font-medium tracking-[0.2em] text-zinc-500 uppercase">
        Discovery quick start
      </p>
      <p className="mt-2 text-base font-semibold tracking-tight text-zinc-100 sm:text-lg">
        Open a live surface.
      </p>

      <div className="mt-3 space-y-2 sm:space-y-2">
        {actions.map((action) => (
          <Link
            key={`${action.href}-${action.label}`}
            href={action.href}
            className="block rounded-lg border border-zinc-800/80 bg-zinc-950/45 px-3 py-2 transition hover:border-zinc-700 hover:bg-zinc-900/60"
          >
            <p className="text-sm font-medium text-zinc-100">{action.label}</p>
            {action.description ? (
              <p className="mt-0.5 text-xs leading-5 text-zinc-400">{action.description}</p>
            ) : null}
          </Link>
        ))}
      </div>

      {footerText ? <p className="mt-3 text-xs text-zinc-500 sm:mt-3.5">{footerText}</p> : null}
    </aside>
  );
}
