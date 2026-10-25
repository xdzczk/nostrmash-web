const LANGUAGE_NAMES: Record<string, string> = {
  en: "English",
  de: "Deutsch",
  es: "Español",
  fr: "Français",
  it: "Italiano",
  pt: "Português",
  ja: "日本語",
  ko: "한국어",
  zh: "中文",
  ru: "Русский",
  nl: "Nederlands",
  pl: "Polski",
  tr: "Türkçe",
  ar: "العربية",
  sv: "Svenska",
  uk: "Українська",
  cs: "Čeština",
  da: "Dansk",
  fi: "Suomi",
  el: "Ελληνικά",
  he: "עברית",
  hi: "हिन्दी",
  hu: "Magyar",
  id: "Bahasa Indonesia",
  no: "Norsk",
  nb: "Norsk bokmål",
  ro: "Română",
  th: "ไทย",
  vi: "Tiếng Việt",
  fa: "فارسی",
  ca: "Català",
  bg: "Български",
  hr: "Hrvatski",
  sk: "Slovenčina",
  sl: "Slovenščina",
  sr: "Srpski",
  et: "Eesti",
  lt: "Lietuvių",
  lv: "Latviešu",
};

/** Languages the search filter can select when the page has no corpus histogram. */
export const KNOWN_LANGUAGE_OPTIONS = Object.keys(LANGUAGE_NAMES).map((language) => ({
  language,
  count: 0,
}));

export function languageDisplayName(code: string): string {
  return LANGUAGE_NAMES[code] ?? code.toUpperCase();
}

export function formatDiscoverEyebrow(eyebrow: string, language?: string): string {
  if (!language) return eyebrow;
  const name = languageDisplayName(language);
  return eyebrow ? `${eyebrow} · ${name}` : name;
}
