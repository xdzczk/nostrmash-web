const DEFAULT_POSTURE_ITEMS = [
  "Durable core",
  "Rebuildable views",
  "Compatible API",
  "Public read layer",
];

export function SystemPosturePanel({
  title = "System posture",
  subtitle = "Durable core, rebuildable edge.",
  description = "From relay ingest to compatible reads.",
  items = DEFAULT_POSTURE_ITEMS,
}: {
  title?: string;
  subtitle?: string;
  description?: string;
  items?: string[];
}) {
  return (
    <aside className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 sm:p-5">
      <p className="text-[11px] font-medium tracking-[0.2em] text-zinc-500 uppercase">{title}</p>
      <p className="mt-2 text-xl font-semibold tracking-tight text-zinc-100">{subtitle}</p>
      <p className="mt-1 text-sm text-zinc-400">{description}</p>
      <ul className="mt-4 space-y-2.5">
        {items.map((item) => (
          <li
            key={item}
            className="rounded-lg border border-zinc-800/90 bg-zinc-950/55 px-3 py-2 text-sm font-medium text-zinc-200"
          >
            {item}
          </li>
        ))}
      </ul>
    </aside>
  );
}
