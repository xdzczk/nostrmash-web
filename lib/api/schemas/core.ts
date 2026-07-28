import { z } from "zod";

export const nativeApiSemanticsSchema = z
  .object({
    consistency: z.string().optional(),
    trust_mode: z.string().optional(),
    trust_applied: z.boolean().optional(),
    result_scope: z.union([z.string(), z.record(z.string(), z.unknown())]).optional(),
    next_cursor: z.string().optional(),
  })
  .passthrough();

export const profileSchema = z
  .object({
    pubkey: z.string().min(1),
    npub: z.string().optional(),
    name: z.string().optional(),
    display_name: z.string().optional(),
    about: z.string().optional(),
    picture: z.string().optional(),
    nip05: z.string().optional(),
    lud16: z.string().optional(),
    website: z.string().optional(),
    recent_post_count: z.number().optional(),
    recent_reply_count: z.number().optional(),
    recent_engagement_received: z.number().optional(),
    recent_new_followers: z.number().optional(),
    recent_zap_volume_msats: z.number().optional(),
    recent_active_days: z.number().optional(),
    recent_activity_at: z.number().optional(),
  })
  .passthrough();

const hex64 = z.string().regex(/^[0-9a-f]{64}$/i, "expected 64-char hex identity");

export const eventRecordSchema = z
  .object({
    id: hex64,
    pubkey: z.string().optional(),
    kind: z.number().optional(),
    created_at: z.number().optional(),
    content: z.string().optional(),
    tags: z.array(z.array(z.string())).optional(),
  })
  .passthrough();

export const eventListResponseSchema = nativeApiSemanticsSchema
  .extend({
    notes: z.array(eventRecordSchema).optional(),
    events: z.array(eventRecordSchema).optional(),
  })
  .passthrough();

export const profileListResponseSchema = nativeApiSemanticsSchema
  .extend({
    profiles: z.array(profileSchema).optional(),
  })
  .passthrough();

export const searchSuggestResponseSchema = nativeApiSemanticsSchema
  .extend({
    query: z.string().optional(),
    profiles: z.array(profileSchema).optional(),
    suggested_profiles: z.array(profileSchema).optional(),
    hashtags: z.array(z.unknown()).optional(),
    suggested_hashtags: z.array(z.unknown()).optional(),
    relays: z.array(z.unknown()).optional(),
  })
  .passthrough();

export type ProfileSchema = z.infer<typeof profileSchema>;
export type EventRecordSchema = z.infer<typeof eventRecordSchema>;
export type NativeApiSemanticsSchema = z.infer<typeof nativeApiSemanticsSchema>;
export type SearchSuggestResponseSchema = z.infer<typeof searchSuggestResponseSchema>;
