"use client";

import { useEffect, useId, type ChangeEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { languageDisplayName } from "@/lib/i18n/language-names";
import {
  buildLanguageHref,
  parseLanguage,
  selectLanguageOptions,
  serializeLanguageCookie,
} from "@/lib/search-params/language";

/** Other menu choices warmed the way the 24h/7d/30d links are. */
const LANGUAGE_PREFETCH_LIMIT = 8;

export function LanguageSelector({
  path,
  query,
  activeLanguage,
  options,
  /**
   * Discover rankings are worth fetching before the choice. Search is not:
   * each query is its own uncached search, and warming every language would
   * multiply that work.
   */
  prefetchLanguages = false,
}: {
  path: string;
  query: string;
  activeLanguage?: string;
  options: Array<{ language: string; count: number }>;
  prefetchLanguages?: boolean;
}) {
  const router = useRouter();
  const selectId = useId();
  const listed = selectLanguageOptions(options, activeLanguage);
  const preserved = new URLSearchParams(query);
  preserved.delete("lang");
  preserved.delete("cursor");
  preserved.delete("health_cursor");
  preserved.delete("offset");

  useEffect(() => {
    document.cookie = serializeLanguageCookie(activeLanguage);
  }, [activeLanguage]);

  function onLanguageChange(event: ChangeEvent<HTMLSelectElement>) {
    const next = parseLanguage(event.target.value);
    document.cookie = serializeLanguageCookie(next);
    router.push(buildLanguageHref(path, new URLSearchParams(query), next));
  }

  const prefetchHrefs = prefetchLanguages
    ? languagePrefetchHrefs(path, query, activeLanguage, listed)
    : [];

  return (
    <form action={path} method="get" className="relative inline-flex">
      {Array.from(preserved.entries()).map(([key, value]) => (
        <input key={`${key}:${value}`} type="hidden" name={key} value={value} />
      ))}
      <label
        htmlFor={selectId}
        className="border-edge-strong bg-surface/40 inline-flex items-center gap-1.5 rounded-full border py-0.5 pr-1.5 pl-2.5"
      >
        <span className="text-ink-muted text-[11px] font-medium">Language</span>
        <select
          id={selectId}
          name="lang"
          value={activeLanguage ?? ""}
          onChange={onLanguageChange}
          className="text-ink focus-visible:ring-accent-soft/70 max-w-[11rem] cursor-pointer bg-transparent py-1 text-[11px] font-medium outline-none focus-visible:ring-2"
        >
          <option value="">All languages</option>
          {listed.map((option) => (
            <option key={option.language} value={option.language}>
              {languageDisplayName(option.language)}
            </option>
          ))}
        </select>
      </label>
      <noscript>
        <button type="submit" className="text-ink-muted px-2 text-[11px] font-medium">
          Apply
        </button>
      </noscript>
      {prefetchHrefs.length > 0 ? (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-0 left-0 size-px overflow-hidden"
        >
          {prefetchHrefs.map((href) => (
            <Link key={href} href={href} prefetch tabIndex={-1}>
              <span className="inline-block size-px" />
            </Link>
          ))}
        </div>
      ) : null}
    </form>
  );
}

function languagePrefetchHrefs(
  path: string,
  query: string,
  activeLanguage: string | undefined,
  listed: Array<{ language: string }>
): string[] {
  const choices: Array<string | undefined> = [];
  if (activeLanguage) choices.push(undefined);
  for (const option of listed) {
    if (option.language === activeLanguage) continue;
    choices.push(option.language);
  }
  const params = new URLSearchParams(query);
  return choices
    .slice(0, LANGUAGE_PREFETCH_LIMIT)
    .map((language) => buildLanguageHref(path, params, language));
}
