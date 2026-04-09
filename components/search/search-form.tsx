"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function SearchForm({
  initialQuery = "",
  className = "",
  helperText,
  variant = "default",
}: {
  initialQuery?: string;
  className?: string;
  helperText?: string;
  variant?: "default" | "hero";
}) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const heroVariant = variant === "hero";

  return (
    <form
      className={`w-full space-y-2 ${className}`}
      onSubmit={(event) => {
        event.preventDefault();
        const trimmed = query.trim();
        if (!trimmed) return;
        router.push(`/search?q=${encodeURIComponent(trimmed)}&tab=all&window=7d`);
      }}
    >
      <div className="flex w-full gap-2">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search notes, profiles, hashtags..."
          aria-label="Search notes, profiles, and hashtags"
          className={`w-full rounded-lg border px-4 py-3 text-sm text-zinc-100 outline-none ${
            heroVariant
              ? "border-zinc-700/90 bg-zinc-950/90 placeholder:text-zinc-500 focus:border-zinc-600 focus:ring-2 focus:ring-indigo-400/70"
              : "border-zinc-700 bg-zinc-950 placeholder:text-zinc-500 focus:ring-2 focus:ring-indigo-400"
          }`}
        />
        <button
          type="submit"
          className={`rounded-lg px-5 py-3 text-sm font-medium text-white transition ${
            heroVariant
              ? "bg-indigo-500/95 hover:bg-indigo-400"
              : "bg-indigo-500 hover:bg-indigo-400"
          }`}
        >
          Search
        </button>
      </div>
      {helperText ? (
        <p className={`text-xs ${heroVariant ? "text-zinc-500" : "text-zinc-400"}`}>{helperText}</p>
      ) : null}
    </form>
  );
}
