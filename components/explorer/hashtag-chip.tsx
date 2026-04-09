import Link from "next/link";

export function HashtagChip({
  hashtag,
  count,
  href,
  rank,
}: {
  hashtag: string;
  count?: number;
  href?: string;
  rank?: number;
}) {
  const content = (
    <>
      <p className="text-sm font-medium text-zinc-100">
        {typeof rank === "number" ? `${rank}. ` : ""}#{hashtag || "unknown"}
      </p>
      <p className="text-xs text-zinc-400">
        {typeof count === "number" ? `${count.toLocaleString()} mentions` : "Count unavailable"}
      </p>
    </>
  );

  if (!href) {
    return <div className="rounded-md border border-zinc-800 bg-zinc-900/40 p-3">{content}</div>;
  }

  return (
    <Link
      href={href}
      className="block rounded-md border border-zinc-800 bg-zinc-900/40 p-3 transition hover:border-indigo-400/40"
    >
      {content}
    </Link>
  );
}
