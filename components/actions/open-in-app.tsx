export function OpenInApp({ links }: { links: { href: string; label: string }[] }) {
  if (links.length === 0) return null;
  return (
    <details className="relative inline-block">
      <summary className="nm-pressable border-edge-strong text-ink-soft hover:text-ink inline-flex min-h-9 cursor-pointer list-none items-center rounded-full border px-3 text-xs font-medium">
        Open in app
      </summary>
      <div className="border-edge bg-surface absolute z-20 mt-2 flex min-w-40 flex-col rounded-lg border p-1">
        {links.map((link) => (
          <a
            key={link.href}
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-ink-soft hover:text-ink rounded-md px-3 py-2 text-sm"
          >
            {link.label}
          </a>
        ))}
      </div>
    </details>
  );
}
