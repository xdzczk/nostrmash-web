"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { normalizeProfiles as normalizeApiProfiles } from "@/lib/api/normalize";
import { isValidHashtag } from "@/lib/hashtags";
import type { Profile, HashtagEntry } from "@/lib/types/api";

export interface SuggestResult {
  profiles: Profile[];
  hashtags: HashtagEntry[];
}

const EMPTY: SuggestResult = { profiles: [], hashtags: [] };

function normalizeProfiles(raw: unknown): Profile[] {
  return normalizeApiProfiles(raw);
}

function normalizeHashtags(raw: unknown): HashtagEntry[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((entry): entry is HashtagEntry => {
    if (typeof entry !== "object" || entry === null) return false;
    const tag = String((entry as HashtagEntry).hashtag ?? "").replace(/^#/, "");
    return isValidHashtag(tag);
  });
}

function normalizeQuery(raw: string): string {
  return raw
    .trim()
    .replace(/^nostr:/i, "")
    .replace(/^[@#]/, "")
    .trim();
}

export function useSearchSuggest(query: string, debounceMs = 220) {
  const [result, setResult] = useState<SuggestResult>(EMPTY);
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const normalizedQuery = useMemo(() => normalizeQuery(query), [query]);
  const tooShort = normalizedQuery.length < 2;

  const clear = useCallback(() => {
    setResult(EMPTY);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    abortRef.current?.abort();

    if (tooShort) return;

    timerRef.current = setTimeout(() => {
      const controller = new AbortController();
      abortRef.current = controller;
      setLoading(true);

      fetch(`/api/search/suggest?q=${encodeURIComponent(normalizedQuery)}&limit=8`, {
        signal: controller.signal,
      })
        .then(async (res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.json() as Promise<Record<string, unknown>>;
        })
        .then((body) => {
          if (controller.signal.aborted) return;
          setResult({
            profiles: normalizeProfiles(body.profiles),
            hashtags: normalizeHashtags(body.hashtags),
          });
        })
        .catch((err: unknown) => {
          if (err instanceof DOMException && err.name === "AbortError") return;
          if (controller.signal.aborted) return;
          setResult(EMPTY);
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, debounceMs);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      abortRef.current?.abort();
    };
  }, [normalizedQuery, debounceMs, tooShort]);

  const effective = tooShort ? EMPTY : result;
  const hasResults = effective.profiles.length > 0 || effective.hashtags.length > 0;

  return { ...effective, loading: tooShort ? false : loading, hasResults, clear };
}
