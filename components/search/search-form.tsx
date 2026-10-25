"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback, useMemo, useRef, useState, useSyncExternalStore } from "react";

import {
  profileIdentifier,
  profileLabel,
  profileSecondaryLabel,
} from "@/components/explorer/utils";
import {
  SuggestionDropdown,
  type SearchSuggestionAction,
} from "@/components/search/suggestion-dropdown";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSearchSuggest } from "@/hooks/use-search-suggest";
import { isValidHashtag } from "@/lib/hashtags";
import { resolveSearchIntent } from "@/lib/search/intent";
import { belowVolumeFloor, listedVolume } from "@/lib/discover/reasons";
import type { HashtagEntry, Profile } from "@/lib/types/api";

type SearchShortcut = {
  label: string;
  query?: string;
  href?: string;
};

const SEARCH_PLACEHOLDER = "Search notes, people, topics, or relays";
const RECENT_SEARCHES_KEY = "nm_recent_searches";
const RECENT_SEARCHES_EVENT = "nm-recent-searches";
const MAX_RECENT_SEARCHES = 8;
const EMPTY_RECENTS: string[] = [];
const RECENT_RAW_UNSET = Symbol("recent-raw-unset");

let recentSnapshot: string[] = EMPTY_RECENTS;
let recentRaw: string | null | typeof RECENT_RAW_UNSET = RECENT_RAW_UNSET;

function parseRecentSearches(raw: string | null): string[] {
  try {
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((entry): entry is string => typeof entry === "string")
      .slice(0, MAX_RECENT_SEARCHES);
  } catch {
    return [];
  }
}

function recentSearchesSnapshot(): string[] {
  if (typeof window === "undefined") return recentSnapshot;
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(RECENT_SEARCHES_KEY);
  } catch {
    raw = null;
  }
  if (raw === recentRaw) return recentSnapshot;
  recentRaw = raw;
  recentSnapshot = parseRecentSearches(raw);
  return recentSnapshot;
}

function subscribeRecentSearches(onStoreChange: () => void) {
  window.addEventListener(RECENT_SEARCHES_EVENT, onStoreChange);
  window.addEventListener("storage", onStoreChange);
  return () => {
    window.removeEventListener(RECENT_SEARCHES_EVENT, onStoreChange);
    window.removeEventListener("storage", onStoreChange);
  };
}

function publishRecentSearches() {
  recentRaw = RECENT_RAW_UNSET;
  window.dispatchEvent(new Event(RECENT_SEARCHES_EVENT));
}

function readRecentSearches(): string[] {
  return recentSearchesSnapshot();
}

function rememberSearch(query: string) {
  const trimmed = query.trim();
  if (!trimmed) return;
  const next = [
    trimmed,
    ...readRecentSearches().filter((entry) => entry.toLowerCase() !== trimmed.toLowerCase()),
  ].slice(0, MAX_RECENT_SEARCHES);
  try {
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next));
    publishRecentSearches();
  } catch {
    // Private mode and full storage still leave the navigation working.
  }
}

export function SearchForm({
  initialQuery = "",
  className = "",
  helperText,
  variant = "default",
  placeholder,
  shortcuts = [],
  inputId,
  autoFocus = false,
  onNavigate,
  enableRecents = false,
}: {
  initialQuery?: string;
  className?: string;
  helperText?: string;
  variant?: "default" | "hero" | "global";
  placeholder?: string;
  shortcuts?: SearchShortcut[];
  inputId?: string;
  autoFocus?: boolean;
  onNavigate?: () => void;
  /** Remember submitted queries and offer them when the field is empty. */
  enableRecents?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [query, setQuery] = useState(initialQuery);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const recents = useSyncExternalStore(
    subscribeRecentSearches,
    recentSearchesSnapshot,
    () => EMPTY_RECENTS
  );
  const inputRef = useRef<HTMLInputElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const heroVariant = variant === "hero";
  const globalVariant = variant === "global";
  const [routePath, setRoutePath] = useState(pathname);

  // Header search stays mounted across navigations. Drop whatever was typed
  // once the route changes so the field does not keep a previous query.
  if (globalVariant && routePath !== pathname) {
    setRoutePath(pathname);
    setQuery("");
    setOpen(false);
    setActiveIndex(-1);
  }

  const inputPlaceholder = placeholder ?? SEARCH_PLACEHOLDER;

  const {
    profiles: suggestedProfiles,
    hashtags: suggestedHashtags,
    loading: suggestLoading,
    clear: clearSuggest,
  } = useSearchSuggest(query);
  const profiles = useMemo(() => dedupeSuggestProfiles(suggestedProfiles), [suggestedProfiles]);
  const hashtags = useMemo(() => filterSuggestHashtags(suggestedHashtags), [suggestedHashtags]);
  const actions = useMemo(() => stableSearchActions(query, hashtags), [query, hashtags]);
  const totalItems = actions.length + profiles.length + hashtags.length;
  const showDropdown = open && query.trim().length >= 2 && (suggestLoading || totalItems > 0);
  const showRecents = enableRecents && open && query.trim().length === 0 && recents.length > 0;

  const dismiss = useCallback(() => {
    setOpen(false);
    setActiveIndex(-1);
    clearSuggest();
    if (globalVariant) setQuery("");
    onNavigate?.();
  }, [clearSuggest, globalVariant, onNavigate]);

  const navigateToSearch = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      rememberSearch(trimmed);
      dismiss();
      const intent = resolveSearchIntent(trimmed);
      if (intent.href) {
        router.push(intent.href);
        return;
      }
      router.push(`/search?q=${encodeURIComponent(trimmed)}&tab=all`);
    },
    [router, dismiss]
  );

  const handleSelectProfile = useCallback(
    (profile: Profile) => {
      const identifier = profileIdentifier(profile);
      dismiss();
      router.push(`/profiles/${encodeURIComponent(identifier)}`);
    },
    [router, dismiss]
  );

  const handleSelectHashtag = useCallback(
    (tag: string) => {
      const normalized = tag.replace(/^#/, "").trim();
      if (!isValidHashtag(normalized)) {
        // Names/phrases are not hashtags — send them to search instead.
        navigateToSearch(tag);
        return;
      }
      dismiss();
      router.push(`/hashtags/${encodeURIComponent(normalized.toLowerCase())}/notes`);
    },
    [router, dismiss, navigateToSearch]
  );

  const handleSelectAction = useCallback(
    (action: SearchSuggestionAction) => {
      rememberSearch(query);
      dismiss();
      router.push(action.href);
    },
    [router, dismiss, query]
  );

  const commitActiveItem = useCallback(() => {
    if (activeIndex < 0 || activeIndex >= totalItems) return false;
    if (activeIndex < actions.length) {
      const action = actions[activeIndex];
      if (action) handleSelectAction(action);
      return true;
    }
    const profileIndex = activeIndex - actions.length;
    if (profileIndex < profiles.length) {
      const profile = profiles[profileIndex];
      if (profile) handleSelectProfile(profile);
      return true;
    }
    const hashtagIndex = profileIndex - profiles.length;
    const entry = hashtags[hashtagIndex];
    const tag = (entry?.hashtag ?? "").replace(/^#/, "");
    if (tag) {
      handleSelectHashtag(tag);
      return true;
    }
    return false;
  }, [
    activeIndex,
    totalItems,
    actions,
    profiles,
    hashtags,
    handleSelectAction,
    handleSelectProfile,
    handleSelectHashtag,
  ]);

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
            id={inputId}
            autoFocus={autoFocus}
            variant={heroVariant ? "hero" : globalVariant ? "global" : "default"}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setOpen(true);
              setActiveIndex(-1);
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => {
              window.setTimeout(() => {
                const active = document.activeElement;
                if (active instanceof Node && inputRef.current?.form?.contains(active)) return;
                setOpen(false);
                setActiveIndex(-1);
              }, 150);
            }}
            onKeyDown={handleKeyDown}
            placeholder={inputPlaceholder}
            role="combobox"
            aria-expanded={showDropdown}
            aria-controls="search-suggest-listbox"
            aria-activedescendant={
              showDropdown && activeIndex >= 0 ? `search-suggest-option-${activeIndex}` : undefined
            }
            aria-haspopup="listbox"
            aria-autocomplete="list"
            aria-label="Search notes, profiles, hashtags, relays, and event IDs"
          />
          {globalVariant ? (
            <kbd className="border-edge text-ink-faint pointer-events-none absolute top-1/2 right-12 hidden -translate-y-1/2 rounded border px-1.5 py-0.5 text-[10px] leading-none [@media(hover:hover)]:inline">
              /
            </kbd>
          ) : null}
          {showDropdown && (
            <SuggestionDropdown
              ref={dropdownRef}
              actions={actions}
              profiles={profiles}
              hashtags={hashtags}
              activeIndex={activeIndex}
              query={query}
              loading={suggestLoading}
              onSelectAction={handleSelectAction}
              onSelectProfile={handleSelectProfile}
              onSelectHashtag={handleSelectHashtag}
            />
          )}
          {showRecents ? (
            <div className="border-edge-strong bg-surface absolute inset-x-0 top-full z-50 mt-1 rounded-lg border">
              <div className="flex items-center justify-between px-3 pt-2.5 pb-1">
                <p className="text-ink-faint text-[10px] font-semibold tracking-wider uppercase">
                  Recent
                </p>
                <button
                  type="button"
                  className="text-ink-faint hover:text-ink text-xs"
                  onMouseDown={(event) => {
                    event.preventDefault();
                    try {
                      localStorage.removeItem(RECENT_SEARCHES_KEY);
                      publishRecentSearches();
                    } catch {
                      // Ignore storage failures; the list still closes.
                    }
                  }}
                >
                  Clear
                </button>
              </div>
              {recents.map((recent) => (
                <button
                  key={recent}
                  type="button"
                  className="hover:bg-edge/60 text-ink-dim flex min-h-11 w-full items-center px-3 py-2 text-left text-sm"
                  onMouseDown={(event) => {
                    event.preventDefault();
                    navigateToSearch(recent);
                  }}
                >
                  <span className="truncate">{recent}</span>
                </button>
              ))}
            </div>
          ) : null}
        </div>
        <Button
          type="submit"
          size={globalVariant ? "md" : "lg"}
          variant={globalVariant ? "ghost" : "primary"}
          aria-label={globalVariant ? "Submit search" : undefined}
          className={
            globalVariant
              ? "absolute top-1/2 right-1.5 min-h-9 -translate-y-1/2 px-3"
              : `sm:min-w-[120px] ${heroVariant ? "xl:min-w-[148px] xl:px-6" : ""}`
          }
        >
          {globalVariant ? (
            <svg
              aria-hidden
              viewBox="0 0 24 24"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            >
              <circle cx="11" cy="11" r="6.5" />
              <path d="m16 16 4 4" />
            </svg>
          ) : (
            "Search"
          )}
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
                  dismiss();
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

function dedupeSuggestProfiles(profiles: Profile[]): Profile[] {
  const byLabel = new Map<string, Profile>();
  const order: string[] = [];
  for (const profile of profiles) {
    const key = profileLabel(profile).trim().toLowerCase();
    if (!key) continue;
    const existing = byLabel.get(key);
    if (!existing) {
      byLabel.set(key, profile);
      order.push(key);
      continue;
    }
    if (!profileSecondaryLabel(existing) && profileSecondaryLabel(profile)) {
      byLabel.set(key, profile);
    }
  }
  return order.map((key) => byLabel.get(key)!);
}

function filterSuggestHashtags(hashtags: HashtagEntry[]): HashtagEntry[] {
  return hashtags.filter(
    (entry) => !belowVolumeFloor(listedVolume([entry.event_count, entry.count]))
  );
}

/** Rows that stay available even when suggest returns only profiles. */
function stableSearchActions(
  query: string,
  hashtags: { hashtag?: string }[]
): SearchSuggestionAction[] {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];
  const actions: SearchSuggestionAction[] = [];
  const tag = trimmed.replace(/^#/, "").trim().toLowerCase();
  const alreadyListed = hashtags.some(
    (entry) => (entry.hashtag ?? "").replace(/^#/, "").trim().toLowerCase() === tag
  );
  if (isValidHashtag(tag) && !alreadyListed) {
    actions.push({
      id: `hashtag-${tag}`,
      label: `#${tag}`,
      href: `/hashtags/${encodeURIComponent(tag)}/notes`,
    });
  }
  actions.push({
    id: "search-notes",
    label: `Search notes for ${trimmed}`,
    href: `/search?q=${encodeURIComponent(trimmed)}&tab=notes`,
  });
  actions.push({
    id: "search-profiles",
    label: `Search profiles for ${trimmed}`,
    href: `/search?q=${encodeURIComponent(trimmed)}&tab=profiles`,
  });
  return actions;
}
