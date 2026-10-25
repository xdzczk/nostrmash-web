import type {
  DiscoveryHomeResponse,
  DomainDetailResponse,
  DomainNotesResponse,
  HashtagDetailResponse,
  HashtagNotesResponse,
  LanguageCount,
  RelatedHashtagsResponse,
  TopLanguages,
  TrendingLongFormResponse,
} from "@/lib/types/api";
import { asArray, asNumber, asRecord, asString, compactDefined } from "@/lib/api/normalize/helpers";
import { parseLanguage } from "@/lib/search-params/language";
import {
  normalizeArticleRecords,
  normalizeDomainEntries,
  normalizeDomainLabel,
  normalizeEventRecords,
  normalizeHashtagEntries,
  normalizeProfiles,
} from "@/lib/api/normalize/entities";
import { normalizeDiscoveryListMeta } from "@/lib/api/normalize/ranking";

function normalizeLanguageCounts(value: unknown): LanguageCount[] | undefined {
  const rows = asArray(value)
    .map((entry) => {
      const row = asRecord(entry);
      if (!row) return null;
      const language = asString(row.language)?.trim().toLowerCase();
      const count = asNumber(row.count);
      if (!language || count === undefined) return null;
      return { language, count };
    })
    .filter((row): row is LanguageCount => row !== null);
  return rows.length > 0 ? rows : undefined;
}

export function normalizeTopLanguages(value: unknown): TopLanguages | undefined {
  const record = asRecord(value);
  if (!record) return undefined;
  const result: TopLanguages = {};
  for (const window of ["24h", "7d"] as const) {
    const rows = normalizeLanguageCounts(record[window]);
    if (rows) result[window] = rows;
  }
  return result["24h"] || result["7d"] ? result : undefined;
}

type DiscoveryLanguageFields = {
  language?: string;
  top_languages?: TopLanguages;
};

/** Keep `language` and `top_languages` after a normalizer rebuilds the payload. */
export function normalizeDiscoveryLanguageFields<T extends object>(
  record: T
): Omit<T, "language" | "top_languages"> & DiscoveryLanguageFields {
  const source = record as T & { language?: unknown; top_languages?: unknown };
  const language = parseLanguage(typeof source.language === "string" ? source.language : undefined);
  const topLanguages = normalizeTopLanguages(source.top_languages);
  const next = { ...source } as Omit<T, "language" | "top_languages"> & DiscoveryLanguageFields;
  if (language) next.language = language;
  else delete next.language;
  if (topLanguages) next.top_languages = topLanguages;
  else delete next.top_languages;
  return next;
}

export function normalizeTrendingLongFormResponse(value: unknown): TrendingLongFormResponse {
  const record = asRecord(value) ?? {};
  const articles = normalizeArticleRecords(
    record.articles ??
      record.long_form ??
      record.notes ??
      record.events ??
      record.items ??
      record.data
  );
  const total = asNumber(record.total) ?? (articles.length > 0 ? articles.length : undefined);

  return normalizeDiscoveryLanguageFields(
    compactDefined({
      ...record,
      surface: asString(record.surface),
      window: asString(record.window),
      articles,
      offset: asNumber(record.offset),
      total,
    })
  );
}

export function normalizeHashtagDetailResponse(value: unknown): HashtagDetailResponse {
  const record = asRecord(value) ?? {};
  const hashtag =
    asString(record.hashtag) ??
    asString(record.tag) ??
    asString(record.topic) ??
    asString(asRecord(record.hashtag_entry)?.hashtag);
  const related = normalizeHashtagEntries(
    record.related ??
      record.related_hashtags ??
      record.hashtags ??
      asRecord(record.context)?.related
  );
  const notes = normalizeEventRecords(
    record.notes ??
      record.events ??
      record.items ??
      record.data ??
      asRecord(record.context)?.notes ??
      asRecord(record.context)?.events
  );
  // The summary endpoint reports true mention counts nested under
  // activity.{24h,7d,30d,all}; without reading them this fell back to the
  // notes payload's page size and showed "mentions: 20" for any hashtag.
  const allActivity = asRecord(asRecord(record.activity)?.all);
  const count =
    asNumber(record.count) ??
    asNumber(record.event_count) ??
    asNumber(allActivity?.event_count) ??
    asNumber(record.total);
  const uniqueAuthors =
    asNumber(record.unique_authors) ??
    asNumber(record.unique_profiles) ??
    asNumber(allActivity?.unique_authors);
  const total = asNumber(record.total) ?? (notes.length > 0 ? notes.length : undefined);

  return compactDefined({
    ...record,
    hashtag,
    count,
    event_count: count,
    unique_authors: uniqueAuthors,
    related: related.length > 0 ? related : undefined,
    notes: notes.length > 0 ? notes : undefined,
    total,
  });
}

export function normalizeHashtagNotesResponse(value: unknown): HashtagNotesResponse {
  const record = asRecord(value) ?? {};
  const hashtag =
    asString(record.hashtag) ??
    asString(record.tag) ??
    asString(record.topic) ??
    asString(asRecord(record.context)?.hashtag);
  const notes = normalizeEventRecords(
    record.notes ?? record.events ?? record.items ?? record.data ?? asRecord(record.context)?.notes
  );
  // Only surface a total the backend actually reported. Falling back to the
  // returned page size dressed the 20-item default up as a "total".
  const total = asNumber(record.total);

  return compactDefined({
    ...record,
    hashtag,
    notes,
    total,
  });
}

export function normalizeRelatedHashtagsResponse(value: unknown): RelatedHashtagsResponse {
  const record = asRecord(value) ?? {};
  const hashtag =
    asString(record.hashtag) ??
    asString(record.tag) ??
    asString(record.topic) ??
    asString(asRecord(record.context)?.hashtag);
  const related = normalizeHashtagEntries(
    record.related ?? record.related_hashtags ?? record.hashtags ?? record.items ?? record.data
  );
  const total = asNumber(record.total) ?? (related.length > 0 ? related.length : undefined);

  return compactDefined({
    ...record,
    hashtag,
    related,
    hashtags: related,
    total,
  });
}

export function normalizeDomainDetailResponse(value: unknown): DomainDetailResponse {
  const record = asRecord(value) ?? {};
  const domain =
    normalizeDomainLabel(record.domain) ??
    normalizeDomainLabel(record.host) ??
    normalizeDomainLabel(record.hostname) ??
    normalizeDomainLabel(record.site) ??
    normalizeDomainLabel(record.url) ??
    normalizeDomainLabel(asRecord(record.context)?.domain);
  const notes = normalizeEventRecords(
    record.notes ??
      record.events ??
      record.items ??
      record.data ??
      asRecord(record.context)?.notes ??
      asRecord(record.context)?.events
  );
  const count = asNumber(record.count) ?? asNumber(record.event_count) ?? asNumber(record.total);
  const uniqueAuthors = asNumber(record.unique_authors) ?? asNumber(record.unique_profiles);
  const total = asNumber(record.total) ?? (notes.length > 0 ? notes.length : undefined);

  return compactDefined({
    ...record,
    domain,
    count,
    event_count: count,
    unique_authors: uniqueAuthors,
    notes: notes.length > 0 ? notes : undefined,
    total,
  });
}

export function normalizeDomainNotesResponse(value: unknown): DomainNotesResponse {
  const record = asRecord(value) ?? {};
  const domain =
    normalizeDomainLabel(record.domain) ??
    normalizeDomainLabel(record.host) ??
    normalizeDomainLabel(record.hostname) ??
    normalizeDomainLabel(record.site) ??
    normalizeDomainLabel(record.url) ??
    normalizeDomainLabel(asRecord(record.context)?.domain);
  const notes = normalizeEventRecords(
    record.notes ?? record.events ?? record.items ?? record.data ?? asRecord(record.context)?.notes
  );
  const total = asNumber(record.total) ?? (notes.length > 0 ? notes.length : undefined);

  return compactDefined({
    ...record,
    domain,
    notes,
    total,
  });
}

export function normalizeDiscoveryHomeResponse(
  value: DiscoveryHomeResponse
): DiscoveryHomeResponse {
  const record = asRecord(value) ?? {};
  const sections = asRecord(record.sections);
  const networkSummary = asRecord(sections?.network_summary);
  const activity = asRecord(networkSummary?.activity);
  const activeAuthors = asRecord(activity?.active_authors);
  const noteVolume = asRecord(activity?.note_volume);
  const relays = asRecord(networkSummary?.relays);
  const uniqueAuthors = asRecord(relays?.unique_authors);
  const totals = asRecord(networkSummary?.totals);
  const sectionProfiles = asRecord(sections?.profiles);

  const stats = compactDefined({
    events_ingested: asNumber(totals?.events_ingested),
    projected_profiles: asNumber(totals?.projected_profiles),
    active_authors_24h: asNumber(activeAuthors?.["24h"]),
    note_volume_24h: asNumber(noteVolume?.["24h"]),
    relays_active_24h: asNumber(relays?.active_24h),
    unique_authors_24h: asNumber(uniqueAuthors?.["24h"]),
  });

  return normalizeDiscoveryLanguageFields({
    ...record,
    meta: normalizeDiscoveryListMeta(record.meta),
    computed_at: asString(record.computed_at),
    ranking_version: asString(record.ranking_version),
    window: asString(record.window),
    top_languages: record.top_languages ?? networkSummary?.top_languages,
    notes: normalizeEventRecords(sections?.trending_notes ?? record.trending_notes ?? record.notes),
    profiles: normalizeProfiles(
      sectionProfiles?.trending ?? record.trending_profiles ?? record.profiles
    ),
    rising_profiles: normalizeProfiles(sectionProfiles?.rising ?? record.rising_profiles),
    hashtags: normalizeHashtagEntries(
      sections?.trending_hashtags ?? record.trending_hashtags ?? record.hashtags
    ),
    domains: normalizeDomainEntries(
      sections?.trending_domains ?? sections?.domains ?? record.trending_domains ?? record.domains
    ),
    stats,
  });
}
