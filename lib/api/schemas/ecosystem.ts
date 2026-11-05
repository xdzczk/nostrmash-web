import { z } from "zod";

const count = z.number().optional();
const share = z.number().optional();
const day = z.string().optional();
const label = z.string().optional();

export const domainCountSchema = z
  .object({
    domain: label,
    count,
  })
  .passthrough();

export const clientStatSchema = z
  .object({
    client: label,
    event_count: count,
    unique_authors: count,
  })
  .passthrough();

export const contentFlagStatsSchema = z
  .object({
    events: count,
    bridged_share: share,
    content_warning_share: share,
    pow_share: share,
  })
  .passthrough();

export const clientStatsSchema = z
  .object({
    consistency: z.string().optional(),
    window: label,
    clients: z.array(clientStatSchema).optional(),
    content_flags: contentFlagStatsSchema.optional(),
  })
  .passthrough();

export const identityStatsSchema = z
  .object({
    consistency: z.string().optional(),
    profiles: count,
    nip05_present: count,
    nip05_verified: count,
    lud16_present: count,
    lud06_present: count,
    bot_flagged: count,
    avg_completeness: z.number().optional(),
    nip05_domains: z.array(domainCountSchema).optional(),
    lud16_domains: z.array(domainCountSchema).optional(),
  })
  .passthrough();

export const zapHistogramSchema = z
  .object({
    lt21: count,
    "21_100": count,
    "101_1k": count,
    "1k_10k": count,
    "10k_100k": count,
    gt100k: count,
  })
  .passthrough();

export const zapDayStatSchema = z
  .object({
    day,
    zap_count: count,
    sats_total: count,
    self_zap_count: count,
    nutzap_count: count,
    nutzap_sats: count,
    histogram: zapHistogramSchema.optional(),
  })
  .passthrough();

export const zapStatsSchema = z
  .object({
    consistency: z.string().optional(),
    window: label,
    series: z.array(zapDayStatSchema).optional(),
    unique_senders: count,
    unique_receivers: count,
  })
  .passthrough();

export const accountDayStatSchema = z
  .object({
    day,
    count,
  })
  .passthrough();

export const accountStatsSchema = z
  .object({
    consistency: z.string().optional(),
    new_authors: z.array(accountDayStatSchema).optional(),
    active_authors_1d: count,
    active_authors_7d: count,
  })
  .passthrough();

export const relayPropagationRowSchema = z
  .object({
    relay_url: label,
    events_seen: count,
    first_seen_share: share,
    exclusive_share: share,
    latency_p50_ms: z.number().optional(),
    untrusted_share: share,
  })
  .passthrough();

export const relayPropagationSchema = z
  .object({
    consistency: z.string().optional(),
    window: label,
    relays: z.array(relayPropagationRowSchema).optional(),
  })
  .passthrough();

export const relayOverlapPairSchema = z
  .object({
    relay_a: label,
    relay_b: label,
    shared_events: count,
    jaccard: share,
  })
  .passthrough();

export const relayOverlapSchema = z
  .object({
    consistency: z.string().optional(),
    window: label,
    pairs: z.array(relayOverlapPairSchema).optional(),
  })
  .passthrough();

export const authorZapDaySchema = z
  .object({
    day,
    received_count: count,
    received_sats: count,
    sent_count: count,
    sent_sats: count,
    nutzap_received_count: count,
    nutzap_received_sats: count,
  })
  .passthrough();

export const authorZapAnalyticsSchema = z
  .object({
    consistency: z.string().optional(),
    pubkey: label,
    window: label,
    series: z.array(authorZapDaySchema).optional(),
    inbound_zaps: count,
    inbound_sats: count,
    repeat_zappers: count,
  })
  .passthrough();

export const nip05StatusSchema = z.enum([
  "",
  "pending",
  "verified",
  "mismatch",
  "not_found",
  "unreachable",
  "invalid",
  "blocked",
]);

export const profileIdentitySchema = z
  .object({
    consistency: z.string().optional(),
    pubkey: label,
    name: label,
    display_name: label,
    nip05: label,
    nip05_domain: label,
    nip05_verified: z.boolean().optional(),
    nip05_status: nip05StatusSchema.optional(),
    nip05_checked_at: z.number().optional(),
    lud16: label,
    lud16_domain: label,
    website_domain: label,
    has_picture: z.boolean().optional(),
    has_banner: z.boolean().optional(),
    has_about: z.boolean().optional(),
    is_bot: z.boolean().optional(),
    has_lud06: z.boolean().optional(),
    completeness_score: z.number().optional(),
    accepts_nutzaps: z.boolean().optional(),
  })
  .passthrough();

export const authorAnalyticsWindowSchema = z
  .object({
    window: label,
    engagement_rate_per_post: z.number().optional(),
  })
  .passthrough();

export const authorAnalyticsSummarySchema = z
  .object({
    consistency: z.string().optional(),
    pubkey: label,
    windows: z.array(authorAnalyticsWindowSchema).optional(),
  })
  .passthrough();

export const reactionBreakdownItemSchema = z
  .object({
    content: label,
    count,
  })
  .passthrough();

export const reactionBreakdownSchema = z.array(reactionBreakdownItemSchema);
