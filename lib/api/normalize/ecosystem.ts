import type { z } from "zod";

import { asArray, asBoolean, asRecord, asString } from "@/lib/api/normalize/helpers";
import { softParseApiPayload } from "@/lib/api/schemas/parse";
import {
  accountStatsSchema,
  authorAnalyticsSummarySchema,
  authorZapAnalyticsSchema,
  clientStatsSchema,
  identityStatsSchema,
  profileIdentitySchema,
  reactionBreakdownSchema,
  relayOverlapSchema,
  relayPropagationSchema,
  zapStatsSchema,
} from "@/lib/api/schemas/ecosystem";
import type {
  AccountDayStat,
  AccountStatsResponse,
  AuthorAnalyticsSummary,
  AuthorAnalyticsWindow,
  AuthorZapAnalytics,
  AuthorZapDay,
  ClientStat,
  ClientStatsResponse,
  ContentFlagStats,
  DomainCount,
  IdentityStatsResponse,
  ProfileIdentity,
  ReactionBreakdownItem,
  RelayOverlapPair,
  RelayOverlapResponse,
  RelayPropagationResponse,
  RelayPropagationRow,
  ZapDayStat,
  ZapHistogram,
  ZapStatsResponse,
} from "@/lib/types/api";
import { ZAP_HISTOGRAM_KEYS } from "@/lib/types/api";

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const STATS_WINDOWS = new Set(["24h", "7d", "30d"]);
const REACTION_CONTENT_MAX = 64;
const REACTION_BREAKDOWN_MAX = 20;

function finite(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function nonNegative(value: unknown): number | undefined {
  const number = finite(value);
  if (number === undefined || number < 0) return undefined;
  return number;
}

function text(value: unknown): string | undefined {
  const raw = asString(value)?.trim();
  return raw && raw.length > 0 ? raw : undefined;
}

function dayString(value: unknown): string | undefined {
  return typeof value === "string" && DAY.test(value) ? value : undefined;
}

function statsWindow(value: unknown): string | undefined {
  return typeof value === "string" && STATS_WINDOWS.has(value) ? value : undefined;
}

function consistencyOf(record: Record<string, unknown>): string | undefined {
  return text(record.consistency);
}

function softParse<TSchema extends z.ZodType>(schema: TSchema, value: unknown, context: string) {
  if (value === undefined || value === null) return;
  softParseApiPayload(schema, value, context);
}

function domainCounts(value: unknown): DomainCount[] {
  return asArray(value).flatMap((entry) => {
    const record = asRecord(entry);
    const domain = text(record?.domain);
    if (!domain) return [];
    const count = nonNegative(record?.count);
    return [count === undefined ? { domain } : { domain, count }];
  });
}

export function normalizeClientStats(value: unknown): ClientStatsResponse {
  softParse(clientStatsSchema, value, "clientStats");
  const record = asRecord(value) ?? {};
  const clients = asArray(record.clients).flatMap((entry): ClientStat[] => {
    const row = asRecord(entry);
    const client = text(row?.client);
    if (!client) return [];
    const eventCount = nonNegative(row?.event_count);
    const authors = nonNegative(row?.unique_authors);
    return [
      {
        client,
        ...(eventCount === undefined ? {} : { event_count: eventCount }),
        ...(authors === undefined ? {} : { unique_authors: authors }),
      },
    ];
  });
  const flagsRecord = asRecord(record.content_flags);
  const flags: ContentFlagStats = {};
  if (flagsRecord) {
    const events = nonNegative(flagsRecord.events);
    const bridged = nonNegative(flagsRecord.bridged_share);
    const warning = nonNegative(flagsRecord.content_warning_share);
    const pow = nonNegative(flagsRecord.pow_share);
    if (events !== undefined) flags.events = events;
    if (bridged !== undefined) flags.bridged_share = bridged;
    if (warning !== undefined) flags.content_warning_share = warning;
    if (pow !== undefined) flags.pow_share = pow;
  }
  const window = statsWindow(record.window);
  const consistency = consistencyOf(record);
  return {
    ...(consistency ? { consistency } : {}),
    ...(window ? { window } : {}),
    ...(clients.length > 0 ? { clients } : {}),
    ...(Object.keys(flags).length > 0 ? { content_flags: flags } : {}),
  };
}

export function normalizeIdentityStats(value: unknown): IdentityStatsResponse {
  softParse(identityStatsSchema, value, "identityStats");
  const record = asRecord(value) ?? {};
  const numberField = (key: string) => {
    const number = key === "avg_completeness" ? finite(record[key]) : nonNegative(record[key]);
    return number === undefined ? {} : { [key]: number };
  };
  const nip05Domains = domainCounts(record.nip05_domains);
  const lud16Domains = domainCounts(record.lud16_domains);
  const window = statsWindow(record.window);
  const consistency = consistencyOf(record);
  return {
    ...(consistency ? { consistency } : {}),
    ...(window ? { window } : {}),
    ...numberField("profiles"),
    ...numberField("nip05_present"),
    ...numberField("nip05_verified"),
    ...numberField("lud16_present"),
    ...numberField("lud06_present"),
    ...numberField("bot_flagged"),
    ...numberField("avg_completeness"),
    ...(nip05Domains.length > 0 ? { nip05_domains: nip05Domains } : {}),
    ...(lud16Domains.length > 0 ? { lud16_domains: lud16Domains } : {}),
  };
}

function histogramOf(value: unknown): ZapHistogram | undefined {
  const record = asRecord(value);
  if (!record) return undefined;
  const histogram: ZapHistogram = {};
  for (const key of ZAP_HISTOGRAM_KEYS) {
    const count = nonNegative(record[key]);
    if (count !== undefined) histogram[key] = count;
  }
  return Object.keys(histogram).length > 0 ? histogram : undefined;
}

function zapDay(value: unknown): ZapDayStat | null {
  const record = asRecord(value);
  const day = dayString(record?.day);
  if (!day) return null;
  const histogram = histogramOf(record?.histogram);
  const fields = {
    zap_count: nonNegative(record?.zap_count),
    sats_total: nonNegative(record?.sats_total),
    self_zap_count: nonNegative(record?.self_zap_count),
    nutzap_count: nonNegative(record?.nutzap_count),
    nutzap_sats: nonNegative(record?.nutzap_sats),
  };
  return {
    day,
    ...(fields.zap_count === undefined ? {} : { zap_count: fields.zap_count }),
    ...(fields.sats_total === undefined ? {} : { sats_total: fields.sats_total }),
    ...(fields.self_zap_count === undefined ? {} : { self_zap_count: fields.self_zap_count }),
    ...(fields.nutzap_count === undefined ? {} : { nutzap_count: fields.nutzap_count }),
    ...(fields.nutzap_sats === undefined ? {} : { nutzap_sats: fields.nutzap_sats }),
    ...(histogram ? { histogram } : {}),
  };
}

export function normalizeZapStats(value: unknown): ZapStatsResponse {
  softParse(zapStatsSchema, value, "zapStats");
  const record = asRecord(value) ?? {};
  const series = asArray(record.series).flatMap((entry) => {
    const day = zapDay(entry);
    return day ? [day] : [];
  });
  const senders = nonNegative(record.unique_senders);
  const receivers = nonNegative(record.unique_receivers);
  const window = statsWindow(record.window);
  const consistency = consistencyOf(record);
  return {
    ...(consistency ? { consistency } : {}),
    ...(window ? { window } : {}),
    ...(series.length > 0 ? { series } : {}),
    ...(senders === undefined ? {} : { unique_senders: senders }),
    ...(receivers === undefined ? {} : { unique_receivers: receivers }),
  };
}

export function normalizeAccountStats(value: unknown): AccountStatsResponse {
  softParse(accountStatsSchema, value, "accountStats");
  const record = asRecord(value) ?? {};
  const newAuthors = asArray(record.new_authors).flatMap((entry): AccountDayStat[] => {
    const row = asRecord(entry);
    const day = dayString(row?.day);
    if (!day) return [];
    const count = nonNegative(row?.count);
    return [count === undefined ? { day } : { day, count }];
  });
  const active1d = nonNegative(record.active_authors_1d);
  const active7d = nonNegative(record.active_authors_7d);
  const consistency = consistencyOf(record);
  return {
    ...(consistency ? { consistency } : {}),
    ...(newAuthors.length > 0 ? { new_authors: newAuthors } : {}),
    ...(active1d === undefined ? {} : { active_authors_1d: active1d }),
    ...(active7d === undefined ? {} : { active_authors_7d: active7d }),
  };
}

export function normalizeRelayPropagation(value: unknown): RelayPropagationResponse {
  softParse(relayPropagationSchema, value, "relayPropagation");
  const record = asRecord(value) ?? {};
  const relays = asArray(record.relays).flatMap((entry): RelayPropagationRow[] => {
    const row = asRecord(entry);
    const relayUrl = text(row?.relay_url);
    if (!relayUrl) return [];
    const events = nonNegative(row?.events_seen);
    const first = nonNegative(row?.first_seen_share);
    const exclusive = nonNegative(row?.exclusive_share);
    const latency = nonNegative(row?.latency_p50_ms);
    const untrusted = nonNegative(row?.untrusted_share);
    return [
      {
        relay_url: relayUrl,
        ...(events === undefined ? {} : { events_seen: events }),
        ...(first === undefined ? {} : { first_seen_share: first }),
        ...(exclusive === undefined ? {} : { exclusive_share: exclusive }),
        ...(latency === undefined ? {} : { latency_p50_ms: latency }),
        ...(untrusted === undefined ? {} : { untrusted_share: untrusted }),
      },
    ];
  });
  const window = statsWindow(record.window);
  const consistency = consistencyOf(record);
  return {
    ...(consistency ? { consistency } : {}),
    ...(window ? { window } : {}),
    ...(relays.length > 0 ? { relays } : {}),
  };
}

export function normalizeRelayOverlap(value: unknown): RelayOverlapResponse {
  softParse(relayOverlapSchema, value, "relayOverlap");
  const record = asRecord(value) ?? {};
  const pairs = asArray(record.pairs).flatMap((entry): RelayOverlapPair[] => {
    const row = asRecord(entry);
    const relayA = text(row?.relay_a);
    const relayB = text(row?.relay_b);
    if (!relayA || !relayB) return [];
    const shared = nonNegative(row?.shared_events);
    const jaccard = nonNegative(row?.jaccard);
    return [
      {
        relay_a: relayA,
        relay_b: relayB,
        ...(shared === undefined ? {} : { shared_events: shared }),
        ...(jaccard === undefined ? {} : { jaccard }),
      },
    ];
  });
  const window = statsWindow(record.window);
  const consistency = consistencyOf(record);
  return {
    ...(consistency ? { consistency } : {}),
    ...(window ? { window } : {}),
    ...(pairs.length > 0 ? { pairs } : {}),
  };
}

function authorZapDay(value: unknown): AuthorZapDay | null {
  const record = asRecord(value);
  const day = dayString(record?.day);
  if (!day) return null;
  const receivedCount = nonNegative(record?.received_count);
  const receivedSats = nonNegative(record?.received_sats);
  const sentCount = nonNegative(record?.sent_count);
  const sentSats = nonNegative(record?.sent_sats);
  const nutzapCount = nonNegative(record?.nutzap_received_count);
  const nutzapSats = nonNegative(record?.nutzap_received_sats);
  return {
    day,
    ...(receivedCount === undefined ? {} : { received_count: receivedCount }),
    ...(receivedSats === undefined ? {} : { received_sats: receivedSats }),
    ...(sentCount === undefined ? {} : { sent_count: sentCount }),
    ...(sentSats === undefined ? {} : { sent_sats: sentSats }),
    ...(nutzapCount === undefined ? {} : { nutzap_received_count: nutzapCount }),
    ...(nutzapSats === undefined ? {} : { nutzap_received_sats: nutzapSats }),
  };
}

export function normalizeAuthorZapAnalytics(value: unknown): AuthorZapAnalytics {
  softParse(authorZapAnalyticsSchema, value, "authorZapAnalytics");
  const record = asRecord(value) ?? {};
  const series = asArray(record.series).flatMap((entry) => {
    const day = authorZapDay(entry);
    return day ? [day] : [];
  });
  const inboundZaps = nonNegative(record.inbound_zaps);
  const inboundSats = nonNegative(record.inbound_sats);
  const repeatZappers = nonNegative(record.repeat_zappers);
  const pubkey = text(record.pubkey);
  const window = statsWindow(record.window);
  const consistency = consistencyOf(record);
  return {
    ...(consistency ? { consistency } : {}),
    ...(pubkey ? { pubkey } : {}),
    ...(window ? { window } : {}),
    ...(series.length > 0 ? { series } : {}),
    ...(inboundZaps === undefined ? {} : { inbound_zaps: inboundZaps }),
    ...(inboundSats === undefined ? {} : { inbound_sats: inboundSats }),
    ...(repeatZappers === undefined ? {} : { repeat_zappers: repeatZappers }),
  };
}

export function normalizeProfileIdentity(value: unknown): ProfileIdentity {
  softParse(profileIdentitySchema, value, "profileIdentity");
  const record = asRecord(value) ?? {};
  const verified = asBoolean(record.nip05_verified);
  const checkedAt = nonNegative(record.nip05_checked_at);
  const score = finite(record.completeness_score);
  const accepts = asBoolean(record.accepts_nutzaps);
  const status = typeof record.nip05_status === "string" ? record.nip05_status : undefined;
  const consistency = consistencyOf(record);
  const bool = (key: string) => {
    const value = asBoolean(record[key]);
    return value === undefined ? {} : { [key]: value };
  };
  return {
    ...(consistency ? { consistency } : {}),
    ...(text(record.pubkey) ? { pubkey: text(record.pubkey) } : {}),
    ...(text(record.name) ? { name: text(record.name) } : {}),
    ...(text(record.display_name) ? { display_name: text(record.display_name) } : {}),
    ...(text(record.nip05) ? { nip05: text(record.nip05) } : {}),
    ...(text(record.nip05_domain) ? { nip05_domain: text(record.nip05_domain) } : {}),
    ...(verified === undefined ? {} : { nip05_verified: verified }),
    ...(status === undefined ? {} : { nip05_status: status }),
    ...(checkedAt === undefined ? {} : { nip05_checked_at: checkedAt }),
    ...(text(record.lud16) ? { lud16: text(record.lud16) } : {}),
    ...(text(record.lud16_domain) ? { lud16_domain: text(record.lud16_domain) } : {}),
    ...(text(record.website_domain) ? { website_domain: text(record.website_domain) } : {}),
    ...bool("has_picture"),
    ...bool("has_banner"),
    ...bool("has_about"),
    ...bool("is_bot"),
    ...bool("has_lud06"),
    ...(score === undefined ? {} : { completeness_score: score }),
    ...(accepts === undefined ? {} : { accepts_nutzaps: accepts }),
  };
}

export function normalizeAuthorAnalyticsSummary(value: unknown): AuthorAnalyticsSummary {
  softParse(authorAnalyticsSummarySchema, value, "authorAnalyticsSummary");
  const record = asRecord(value) ?? {};
  const windows = asArray(record.windows).flatMap((entry): AuthorAnalyticsWindow[] => {
    const row = asRecord(entry);
    if (!row) return [];
    const window = text(row.window);
    const rate = finite(row.engagement_rate_per_post);
    if (!window && rate === undefined) return [];
    return [
      {
        ...(window ? { window } : {}),
        ...(rate === undefined ? {} : { engagement_rate_per_post: rate }),
      },
    ];
  });
  const pubkey = text(record.pubkey);
  const consistency = consistencyOf(record);
  return {
    ...(consistency ? { consistency } : {}),
    ...(pubkey ? { pubkey } : {}),
    ...(windows.length > 0 ? { windows } : {}),
  };
}

export function normalizeReactionBreakdown(value: unknown): ReactionBreakdownItem[] {
  if (value === undefined || value === null) return [];
  softParse(reactionBreakdownSchema, value, "reactionBreakdown");
  const totals = new Map<string, number>();
  for (const entry of asArray(value)) {
    const record = asRecord(entry);
    const raw = text(record?.content)?.replace(/\s+/g, " ");
    const count = nonNegative(record?.count);
    if (!raw || raw.length > REACTION_CONTENT_MAX || count === undefined) continue;
    totals.set(raw, (totals.get(raw) ?? 0) + count);
  }
  return [...totals.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, REACTION_BREAKDOWN_MAX)
    .map(([content, count]) => ({ content, count }));
}
