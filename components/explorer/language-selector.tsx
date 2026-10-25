"use client";

import { useEffect, useId, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";

import { languageDisplayName } from "@/lib/i18n/language-names";
import {
  buildLanguageHref,
  parseLanguage,
  selectLanguageOptions,
  serializeLanguageCookie,
} from "@/lib/search-params/language";

export function LanguageSelector({
  path,
  query,
  activeLanguage,
  options,
}: {
  path: string;
  query: string;
  activeLanguage?: string;
  options: Array<{ language: string; count: number }>;
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

  return (
    <form action={path} method="get" className="inline-flex">
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
    </form>
  );
}
