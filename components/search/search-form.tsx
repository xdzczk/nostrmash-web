"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

type SearchShortcut = {
  label: string;
  query?: string;
  href?: string;
};

export function SearchForm({
  initialQuery = "",
  className = "",
  helperText,
  variant = "default",
  placeholder,
  shortcuts = [],
}: {
  initialQuery?: string;
  className?: string;
  helperText?: string;
  variant?: "default" | "hero";
  placeholder?: string;
  shortcuts?: SearchShortcut[];
}) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const heroVariant = variant === "hero";
  const inputPlaceholder =
    placeholder ??
    (heroVariant
      ? "Search notes, profiles, hashtags, relays, or event IDs"
      : "Search notes, profiles, hashtags...");

  return (
    <form
      className={`w-full space-y-2 ${className}`}
      onSubmit={(event) => {
        event.preventDefault();
        const trimmed = query.trim();
        if (!trimmed) return;
        router.push(`/search?q=${encodeURIComponent(trimmed)}&tab=all`);
      }}
    >
      <div className="flex w-full flex-col gap-2 sm:flex-row">
        <input
          ref={inputRef}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={inputPlaceholder}
          aria-label="Search notes, profiles, hashtags, relays, and event IDs"
          className={`w-full min-w-0 rounded-lg border px-4 py-3 text-sm text-zinc-100 outline-none ${
            heroVariant
              ? "border-zinc-700/90 bg-zinc-950/90 placeholder:text-zinc-500 focus:border-zinc-600 focus:ring-2 focus:ring-indigo-400/70"
              : "border-zinc-700 bg-zinc-950 placeholder:text-zinc-500 focus:ring-2 focus:ring-indigo-400"
          }`}
        />
        <button
          type="submit"
          className={`min-h-12 shrink-0 rounded-lg px-5 py-3 text-sm font-medium text-white transition sm:min-w-[120px] ${
            heroVariant
              ? "bg-indigo-500/95 hover:bg-indigo-400"
              : "bg-indigo-500 hover:bg-indigo-400"
          }`}
        >
          Search
        </button>
      </div>
      {heroVariant && shortcuts.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          {shortcuts.map((shortcut) => (
            <button
              key={shortcut.label}
              type="button"
              onClick={() => {
                if (shortcut.href) {
                  router.push(shortcut.href);
                  return;
                }
                if (shortcut.query) {
                  setQuery(shortcut.query);
                  inputRef.current?.focus();
                }
              }}
              className="rounded-full border border-zinc-700/90 bg-zinc-900/70 px-2.5 py-1 text-xs text-zinc-300 transition hover:border-zinc-600 hover:text-zinc-100"
            >
              {shortcut.label}
            </button>
          ))}
        </div>
      ) : null}
      {helperText ? (
        <p className={`text-xs ${heroVariant ? "text-zinc-500" : "text-zinc-400"}`}>{helperText}</p>
      ) : null}
    </form>
  );
}
