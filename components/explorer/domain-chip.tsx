import Link from "next/link";

export function DomainChip({
  domain,
  count,
  href,
  rank,
}: {
  domain: string;
  count?: number;
  href?: string;
  rank?: number;
}) {
  const isTopRank = typeof rank === "number" && rank <= 3;
  const content = (
    <div className="flex items-baseline justify-between gap-3">
      <p
        className={`min-w-0 truncate text-sm font-medium ${isTopRank ? "text-zinc-100" : "text-zinc-200"}`}
      >
        {typeof rank === "number" ? (
          <span className={isTopRank ? "mr-1 text-indigo-300" : "mr-1 text-zinc-500"}>#{rank}</span>
        ) : null}
        {domain || "unknown.domain"}
      </p>
      <p className="shrink-0 text-xs text-zinc-400">
        {typeof count === "number" ? `${count.toLocaleString()} notes` : "Count unavailable"}
      </p>
    </div>
  );

  if (!href) {
    return <div className="rounded-xl bg-zinc-950/30 px-3 py-2.5">{content}</div>;
  }

  return (
    <Link
      href={href}
      className="block rounded-xl bg-zinc-950/30 px-3 py-2.5 transition hover:bg-zinc-950/45"
    >
      {content}
    </Link>
  );
}
