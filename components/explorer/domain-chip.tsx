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
    <>
      <p className={`text-sm font-medium ${isTopRank ? "text-zinc-100" : "text-zinc-200"}`}>
        {typeof rank === "number" ? `#${rank} ` : ""}
        {domain || "unknown.domain"}
      </p>
      <p className={`text-xs ${isTopRank ? "text-zinc-300" : "text-zinc-400"}`}>
        {typeof count === "number" ? `${count.toLocaleString()} notes` : "Count unavailable"}
      </p>
    </>
  );

  if (!href) {
    return (
      <div
        className={`rounded-md border p-3 ${
          isTopRank ? "border-zinc-700 bg-zinc-900/65" : "border-zinc-800 bg-zinc-900/40"
        }`}
      >
        {content}
      </div>
    );
  }

  return (
    <Link
      href={href}
      className={`block rounded-md border p-3 transition hover:border-indigo-400/40 ${
        isTopRank ? "border-zinc-700 bg-zinc-900/65" : "border-zinc-800 bg-zinc-900/40"
      }`}
    >
      {content}
    </Link>
  );
}
