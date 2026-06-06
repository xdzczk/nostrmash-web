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
    <aside className="border-edge bg-surface/35 rounded-xl border p-3.5 sm:p-4">
      <p className="text-ink-faint text-[11px] font-medium tracking-[0.2em] uppercase">
        Discovery quick start
      </p>
      <p className="text-ink mt-2 text-base font-semibold tracking-tight sm:text-lg">
        Start with a live view.
      </p>

      <div className="mt-3 space-y-2 sm:space-y-2">
        {actions.map((action) => (
          <Link
            key={`${action.href}-${action.label}`}
            href={action.href}
            className="border-edge/80 bg-surface-sunken/45 hover:border-edge-strong hover:bg-surface/60 block rounded-lg border px-3 py-2 transition"
          >
            <p className="text-ink text-sm font-medium">{action.label}</p>
            {action.description ? (
              <p className="text-ink-muted mt-0.5 text-xs leading-5">{action.description}</p>
            ) : null}
          </Link>
        ))}
      </div>

      {footerText ? <p className="text-ink-faint mt-3 text-xs sm:mt-3.5">{footerText}</p> : null}
    </aside>
  );
}
