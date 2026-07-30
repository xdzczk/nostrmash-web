"use client";

import { useEffect, useState } from "react";

import { SearchForm } from "@/components/search/search-form";

export function GlobalSearch() {
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const isTyping =
        target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.isContentEditable;
      const opensSearch =
        (event.key === "/" && !isTyping) ||
        ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k");

      if (!opensSearch) return;
      event.preventDefault();

      if (window.matchMedia("(min-width: 768px)").matches) {
        document.getElementById("global-search-input")?.focus();
      } else {
        setMobileOpen(true);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <>
      <div className="hidden min-w-0 flex-1 md:block">
        <SearchForm
          inputId="global-search-input"
          variant="global"
          placeholder="Search notes, people, topics, or relays"
        />
      </div>

      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        aria-label="Open search"
        aria-expanded={mobileOpen}
        className="nm-pressable border-edge/70 bg-surface/45 text-ink-dim hover:text-ink focus-visible:ring-accent-soft/60 inline-flex h-11 w-11 items-center justify-center rounded-xl border focus-visible:ring-2 focus-visible:outline-none md:hidden"
      >
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          className="h-[18px] w-[18px]"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        >
          <circle cx="11" cy="11" r="6.5" />
          <path d="m16 16 4 4" />
        </svg>
      </button>

      {mobileOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Search NostrMash"
          className="bg-background/98 fixed inset-0 z-[90] px-4 pt-[max(1rem,env(safe-area-inset-top))] backdrop-blur-xl md:hidden"
        >
          <div className="mx-auto flex max-w-xl items-center gap-3">
            <SearchForm
              variant="global"
              autoFocus
              onNavigate={() => setMobileOpen(false)}
              placeholder="Search notes, people, topics, or relays"
              className="flex-1"
            />
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="text-ink-muted hover:text-ink focus-visible:ring-accent-soft/60 min-h-11 rounded-lg px-2 text-sm focus-visible:ring-2 focus-visible:outline-none"
            >
              Cancel
            </button>
          </div>
          <p className="text-ink-faint mx-auto mt-4 max-w-xl text-sm">
            Search names, npubs, notes, hashtags, domains, and relay URLs.
          </p>
        </div>
      ) : null}
    </>
  );
}
