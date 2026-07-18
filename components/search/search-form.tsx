"use client";

import { useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";

import { profileIdentifier } from "@/components/explorer/utils";
import { SuggestionDropdown } from "@/components/search/suggestion-dropdown";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSearchSuggest } from "@/hooks/use-search-suggest";
import { isValidHashtag } from "@/lib/hashtags";
import type { Profile } from "@/lib/types/api";

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
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const heroVariant = variant === "hero";
  const inputPlaceholder =
    placeholder ??
    (heroVariant
      ? "Search notes, profiles, hashtags, relays, or event IDs"
      : "Search notes, profiles, hashtags...");

  const { profiles, hashtags, hasResults, clear: clearSuggest } = useSearchSuggest(query);
  const totalItems = profiles.length + hashtags.length;
  const showDropdown = open && hasResults;

  const navigateToSearch = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      setOpen(false);
      clearSuggest();
      router.push(`/search?q=${encodeURIComponent(trimmed)}&tab=all`);
    },
    [router, clearSuggest]
  );

  const handleSelectProfile = useCallback(
    (profile: Profile) => {
      const identifier = profileIdentifier(profile);
      setOpen(false);
      clearSuggest();
      router.push(`/profiles/${encodeURIComponent(identifier)}`);
    },
    [router, clearSuggest]
  );

  const handleSelectHashtag = useCallback(
    (tag: string) => {
      const normalized = tag.replace(/^#/, "").trim();
      if (!isValidHashtag(normalized)) {
        // Names/phrases are not hashtags — send them to search instead.
        navigateToSearch(tag);
        return;
      }
      setOpen(false);
      clearSuggest();
      router.push(`/hashtags/${encodeURIComponent(normalized.toLowerCase())}`);
    },
    [router, clearSuggest, navigateToSearch]
  );

  const commitActiveItem = useCallback(() => {
    if (activeIndex < 0 || activeIndex >= totalItems) return false;
    if (activeIndex < profiles.length) {
      const profile = profiles[activeIndex];
      if (profile) handleSelectProfile(profile);
      return true;
    }
    const hashtagIndex = activeIndex - profiles.length;
    const entry = hashtags[hashtagIndex];
    const tag = (entry?.hashtag ?? "").replace(/^#/, "");
    if (tag) {
      handleSelectHashtag(tag);
      return true;
    }
    return false;
  }, [activeIndex, totalItems, profiles, hashtags, handleSelectProfile, handleSelectHashtag]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (!showDropdown) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((prev) => (prev + 1 >= totalItems ? 0 : prev + 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((prev) => (prev <= 0 ? totalItems - 1 : prev - 1));
      } else if (e.key === "Enter" && activeIndex >= 0) {
        if (commitActiveItem()) {
          e.preventDefault();
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
        setActiveIndex(-1);
      }
    },
    [showDropdown, totalItems, activeIndex, commitActiveItem]
  );

  return (
    <form
      className={`w-full space-y-2 ${className}`}
      onSubmit={(event) => {
        event.preventDefault();
        navigateToSearch(query);
      }}
    >
      <div
        className={`relative flex w-full flex-col gap-2 sm:flex-row ${heroVariant ? "xl:items-stretch xl:gap-3" : ""}`}
      >
        <div className="relative w-full min-w-0">
          <Input
            ref={inputRef}
            variant={heroVariant ? "hero" : "default"}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setOpen(true);
              setActiveIndex(-1);
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => {
              setTimeout(() => setOpen(false), 150);
            }}
            onKeyDown={handleKeyDown}
            placeholder={inputPlaceholder}
            role="combobox"
            aria-expanded={showDropdown}
            aria-controls="search-suggest-listbox"
            aria-haspopup="listbox"
            aria-autocomplete="list"
            aria-label="Search notes, profiles, hashtags, relays, and event IDs"
          />
          {showDropdown && (
            <SuggestionDropdown
              ref={dropdownRef}
              profiles={profiles}
              hashtags={hashtags}
              activeIndex={activeIndex}
              onSelectProfile={handleSelectProfile}
              onSelectHashtag={handleSelectHashtag}
            />
          )}
        </div>
        <Button
          type="submit"
          size="lg"
          className={`sm:min-w-[120px] ${heroVariant ? "xl:min-w-[148px] xl:px-6" : ""}`}
        >
          Search
        </Button>
      </div>
      {heroVariant && shortcuts.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2 xl:gap-2.5">
          {shortcuts.map((shortcut) => (
            <Button
              key={shortcut.label}
              variant="chip"
              size="sm"
              className="min-h-0 px-2.5 py-1"
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
            >
              {shortcut.label}
            </Button>
          ))}
        </div>
      ) : null}
      {helperText ? (
        <p className={`text-xs ${heroVariant ? "text-ink-faint max-w-3xl" : "text-ink-muted"}`}>
          {helperText}
        </p>
      ) : null}
    </form>
  );
}
