import type {
  DiscoveryHomeResponse,
  DomainDetailResponse,
  DomainNotesResponse,
  HashtagDetailResponse,
  HashtagNotesResponse,
  RelatedHashtagsResponse,
  TrendingLongFormResponse,
} from "@/lib/types/api";
import { asNumber, asRecord, asString, compactDefined } from "@/lib/api/normalize/helpers";
import {
  normalizeArticleRecords,
  normalizeDomainEntries,
  normalizeDomainLabel,
  normalizeEventRecords,
  normalizeHashtagEntries,
  normalizeProfiles,
} from "@/lib/api/normalize/entities";

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

  return compactDefined({
    ...record,
    surface: asString(record.surface),
    window: asString(record.window),
    articles,
    offset: asNumber(record.offset),
    total,
  });
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
  const count = asNumber(record.count) ?? asNumber(record.event_count) ?? asNumber(record.total);
  const uniqueAuthors = asNumber(record.unique_authors) ?? asNumber(record.unique_profiles);
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
  const total = asNumber(record.total) ?? (notes.length > 0 ? notes.length : undefined);

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

  return {
    ...record,
    notes: normalizeEventRecords(sections?.trending_notes ?? record.trending_notes ?? record.notes),
    profiles: normalizeProfiles(
      sectionProfiles?.trending ?? record.trending_profiles ?? record.profiles
    ),
    hashtags: normalizeHashtagEntries(
      sections?.trending_hashtags ?? record.trending_hashtags ?? record.hashtags
    ),
    domains: normalizeDomainEntries(
      sections?.trending_domains ?? sections?.domains ?? record.trending_domains ?? record.domains
    ),
    stats,
  };
}
