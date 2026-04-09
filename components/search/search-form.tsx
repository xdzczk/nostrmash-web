"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function SearchForm({
  initialQuery = "",
  className = "",
}: {
  initialQuery?: string;
  className?: string;
}) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);

  return (
    <form
      className={`flex w-full gap-2 ${className}`}
      onSubmit={(event) => {
        event.preventDefault();
        const trimmed = query.trim();
        if (!trimmed) return;
        router.push(`/search?q=${encodeURIComponent(trimmed)}&tab=all&window=7d`);
      }}
    >
      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search notes, profiles, hashtags..."
        className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none ring-indigo-400 placeholder:text-zinc-500 focus:ring-2"
      />
      <button
        type="submit"
        className="rounded-md bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-400"
      >
        Search
      </button>
    </form>
  );
}
