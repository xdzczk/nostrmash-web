import type {
  AuthorEventsResponse,
  AuthorReactionRecord,
  AuthorReactionsResponse,
  AuthorRepliesResponse,
  AuthorZapRecord,
  AuthorZapsResponse,
  Profile,
  ProfileSummaryResponse,
  RelatedProfilesResponse,
  UserBookmarksResponse,
  UserHighlightsResponse,
  UserLongFormResponse,
  UserMuteListResponse,
  UserMutedByResponse,
} from "@/lib/types/api";
import {
  asArray,
  asNumber,
  asRecord,
  asString,
  compactDefined,
  firstString,
  parseJsonRecord,
  parseNumericAmount,
} from "@/lib/api/normalize/helpers";
import {
  normalizeArticleRecords,
  normalizeEventRecord,
  normalizeEventRecords,
  normalizeProfile,
  normalizeProfiles,
  normalizeProfileStats,
} from "@/lib/api/normalize/entities";

export function normalizeUserLongFormResponse(value: unknown): UserLongFormResponse {
  const record = asRecord(value) ?? {};
  const articles = normalizeArticleRecords(
    record.articles ??
      record.long_form ??
      record.notes ??
      record.events ??
      record.items ??
      record.data ??
      (Array.isArray(value) ? value : [])
  );
  const total = asNumber(record.total) ?? asNumber(record.count);

  return compactDefined({
    ...record,
    pubkey: asString(record.pubkey) ?? asString(record.author_pubkey),
    articles,
    total: total ?? (articles.length > 0 ? articles.length : undefined),
  });
}

export function normalizeUserBookmarksResponse(value: unknown): UserBookmarksResponse {
  const record = asRecord(value) ?? {};
  const events = normalizeEventRecords(
    record.bookmarks ??
      record.events ??
      record.notes ??
      record.items ??
      record.data ??
      (Array.isArray(value) ? value : [])
  );
  const total = asNumber(record.total) ?? asNumber(record.count);

  return compactDefined({
    ...record,
    pubkey: asString(record.pubkey) ?? asString(record.author_pubkey),
    events,
    total: total ?? (events.length > 0 ? events.length : undefined),
  });
}

export function normalizeUserHighlightsResponse(value: unknown): UserHighlightsResponse {
  const record = asRecord(value) ?? {};
  const highlights = normalizeEventRecords(
    record.highlights ??
      record.events ??
      record.notes ??
      record.items ??
      record.data ??
      (Array.isArray(value) ? value : [])
  );
  const total = asNumber(record.total) ?? asNumber(record.count);

  return compactDefined({
    ...record,
    pubkey: asString(record.pubkey) ?? asString(record.author_pubkey),
    highlights,
    total: total ?? (highlights.length > 0 ? highlights.length : undefined),
  });
}

export function normalizeUserMuteListResponse(value: unknown): UserMuteListResponse {
  const record = asRecord(value) ?? {};
  const fallbackItems = Array.isArray(value) ? value : [];
  const profiles = normalizeProfiles(
    record.muted ??
      record.muted_profiles ??
      record.profiles ??
      record.users ??
      record.items ??
      record.data ??
      fallbackItems
  );
  const mutedPubkeys = normalizeStringArray(
    record.muted_pubkeys ?? record.mute_pubkeys ?? record.pubkeys
  );
  const profilesFromPubkeys = mutedPubkeys.map((pubkey) => ({ pubkey }) satisfies Profile);
  const total = asNumber(record.total) ?? asNumber(record.count);
  const merged = dedupeProfilesByPubkey([...profiles, ...profilesFromPubkeys]);

  return compactDefined({
    ...record,
    pubkey: asString(record.pubkey) ?? asString(record.author_pubkey),
    profiles: merged,
    total: total ?? (merged.length > 0 ? merged.length : undefined),
  });
}

export function normalizeUserMutedByResponse(value: unknown): UserMutedByResponse {
  const record = asRecord(value) ?? {};
  const fallbackItems = Array.isArray(value) ? value : [];
  const profiles = dedupeProfilesByPubkey(
    normalizeProfiles(
      record.muted_by ??
        record.muters ??
        record.profiles ??
        record.users ??
        record.items ??
        record.data ??
        fallbackItems
    )
  );
  const total = asNumber(record.total) ?? asNumber(record.count);

  return compactDefined({
    ...record,
    pubkey: asString(record.pubkey) ?? asString(record.author_pubkey),
    profiles,
    total: total ?? (profiles.length > 0 ? profiles.length : undefined),
  });
}

export function normalizeProfileSummaryResponse(value: unknown): ProfileSummaryResponse {
  const record = asRecord(value) ?? {};
  const profile = normalizeProfile(record);
  const stats = normalizeProfileStats(record.stats);
  const recentNotePreviews = normalizeEventRecords(
    record.recent_note_previews ?? record.recentNotes ?? record.recent_notes
  );

  return {
    ...record,
    ...(profile ?? {}),
    ...(stats ?? {}),
    pubkey: asString(record.pubkey) ?? profile?.pubkey,
    profile: profile ?? undefined,
    stats,
    recent_note_previews: recentNotePreviews.length > 0 ? recentNotePreviews : undefined,
  };
}

export function normalizeAuthorEventsResponse(value: unknown): AuthorEventsResponse {
  const record = asRecord(value) ?? {};
  const fallbackItems = Array.isArray(value) ? value : [];

  return {
    ...record,
    pubkey: asString(record.pubkey) ?? asString(record.author_pubkey),
    events: normalizeEventRecords(
      record.events ?? record.notes ?? record.items ?? record.data ?? fallbackItems
    ),
  };
}

export function normalizeAuthorRepliesResponse(value: unknown): AuthorRepliesResponse {
  const record = asRecord(value) ?? {};
  const fallbackItems = Array.isArray(value) ? value : [];

  return {
    ...record,
    pubkey: asString(record.pubkey) ?? asString(record.author_pubkey),
    replies: normalizeEventRecords(
      record.replies ??
        record.events ??
        record.notes ??
        record.items ??
        record.data ??
        fallbackItems
    ),
  };
}

export function extractTagReference(value: unknown, tagName: string): string | undefined {
  const record = asRecord(value);
  const tags = record?.tags;
  if (!Array.isArray(tags)) return undefined;
  for (const tag of tags) {
    if (!Array.isArray(tag) || tag.length < 2) continue;
    if (String(tag[0]).toLowerCase() !== tagName.toLowerCase()) continue;
    const candidate = asString(tag[1]);
    if (candidate) return candidate;
  }
  return undefined;
}

export function extractZapDescriptionRecord(value: unknown): Record<string, unknown> | null {
  const record = asRecord(value);
  const event = asRecord(record?.event) ?? record;
  const tags = event?.tags;
  if (!Array.isArray(tags)) return null;
  for (const tag of tags) {
    if (!Array.isArray(tag) || tag.length < 2) continue;
    if (String(tag[0]).toLowerCase() !== "description") continue;
    return parseJsonRecord(tag[1]);
  }
  return null;
}

export function extractZapAmountMsats(
  description: Record<string, unknown> | null
): number | undefined {
  if (!description) return undefined;
  const directAmount = parseNumericAmount(description.amount);
  if (directAmount) return directAmount;
  const tags = description.tags;
  if (!Array.isArray(tags)) return undefined;
  for (const tag of tags) {
    if (!Array.isArray(tag) || tag.length < 2) continue;
    if (String(tag[0]).toLowerCase() !== "amount") continue;
    const amount = parseNumericAmount(tag[1]);
    if (amount) return amount;
  }
  return undefined;
}

export function normalizeAuthorReactionRecord(value: unknown): AuthorReactionRecord | null {
  const record = asRecord(value);
  if (!record) return null;
  const nestedEvent = normalizeEventRecord(record.event);
  const reactionEvent =
    nestedEvent ?? (asNumber(record.kind) === 7 ? normalizeEventRecord(record) : null);
  const targetEvent = normalizeEventRecord(
    record.target_event ?? record.target_note ?? record.target
  );
  const targetEventId = firstString(
    record.target_event_id,
    targetEvent?.id,
    extractTagReference(record, "e"),
    reactionEvent ? extractTagReference(reactionEvent, "e") : undefined
  );
  if (!reactionEvent && !targetEventId && !asString(record.reaction)) return null;

  return compactDefined({
    ...record,
    event_id: firstString(record.event_id, reactionEvent?.id),
    target_event_id: targetEventId,
    reaction: firstString(
      record.reaction,
      record.reaction_type,
      reactionEvent?.content,
      record.content
    ),
    created_at: asNumber(record.created_at) ?? reactionEvent?.created_at,
    event: reactionEvent ?? undefined,
    target_event: targetEvent ?? undefined,
    target_note: targetEvent ?? undefined,
  });
}

export function normalizeAuthorReactionsResponse(value: unknown): AuthorReactionsResponse {
  const record = asRecord(value) ?? {};
  const fallbackItems = Array.isArray(value) ? value : [];
  const rawItems =
    record.reactions ??
    record.items ??
    record.events ??
    record.notes ??
    record.data ??
    fallbackItems;

  return {
    ...record,
    pubkey: asString(record.pubkey) ?? asString(record.author_pubkey),
    reactions: asArray(rawItems)
      .map((entry) => normalizeAuthorReactionRecord(entry))
      .filter((entry): entry is AuthorReactionRecord => Boolean(entry)),
  };
}

export function normalizeAuthorZapRecord(value: unknown): AuthorZapRecord | null {
  const record = asRecord(value);
  if (!record) return null;
  const nestedEvent = normalizeEventRecord(record.event);
  const directEvent =
    asNumber(record.kind) === 9735 || asNumber(record.kind) === 9734
      ? normalizeEventRecord(record)
      : null;
  const event = nestedEvent ?? directEvent;
  const targetEvent = normalizeEventRecord(
    record.target_event ?? record.target_note ?? record.target
  );
  const description = extractZapDescriptionRecord(record.event ? record : event);
  const amountMsats =
    parseNumericAmount(record.msats) ??
    parseNumericAmount(record.amount_msats) ??
    parseNumericAmount(record.amount) ??
    extractZapAmountMsats(description);
  const satsFromRecord = parseNumericAmount(record.sats);
  const sats =
    satsFromRecord && satsFromRecord > 0
      ? satsFromRecord
      : amountMsats && amountMsats > 0
        ? Math.round(amountMsats / 1000)
        : undefined;
  const zapText = firstString(
    record.zap_text,
    record.content,
    description?.content,
    event?.content
  );
  const targetEventId = firstString(
    record.target_event_id,
    targetEvent?.id,
    extractTagReference(record, "e"),
    event ? extractTagReference(event, "e") : undefined
  );

  if (!event && !targetEventId && sats === undefined && !zapText) return null;

  return compactDefined({
    ...record,
    event_id: firstString(record.event_id, event?.id),
    sender_pubkey: firstString(record.sender_pubkey, event?.pubkey),
    receiver_pubkey: asString(record.receiver_pubkey),
    target_event_id: targetEventId,
    sats,
    msats: amountMsats,
    amount_msats: amountMsats,
    zap_text: zapText && zapText.trim().length > 0 ? zapText.trim() : undefined,
    created_at: asNumber(record.created_at) ?? event?.created_at,
    event: event ?? undefined,
    target_event: targetEvent ?? undefined,
    target_note: targetEvent ?? undefined,
  });
}

export function normalizeAuthorZapsResponse(value: unknown): AuthorZapsResponse {
  const record = asRecord(value) ?? {};
  const fallbackItems = Array.isArray(value) ? value : [];

  return {
    ...record,
    pubkey: asString(record.pubkey) ?? asString(record.author_pubkey),
    zaps: asArray(record.zaps ?? record.items ?? record.data ?? fallbackItems)
      .map((entry) => normalizeAuthorZapRecord(entry))
      .filter((entry): entry is AuthorZapRecord => Boolean(entry)),
  };
}

export function normalizeStringArray(value: unknown): string[] {
  return asArray(value)
    .filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0)
    .map((entry) => entry.trim());
}

export function dedupeProfilesByPubkey(profiles: Profile[]): Profile[] {
  const keyedProfiles = profiles.map((profile, index) => {
    const pubkey =
      typeof profile.pubkey === "string" && profile.pubkey.length > 0
        ? profile.pubkey.toLowerCase()
        : null;
    const npub =
      typeof profile.npub === "string" && profile.npub.length > 0
        ? profile.npub.toLowerCase()
        : null;
    return [pubkey ?? npub ?? `profile-${index}`, profile] as const;
  });
  return Array.from(new Map(keyedProfiles).values());
}

export function normalizeRelatedProfilesResponse(value: unknown): RelatedProfilesResponse {
  const record = asRecord(value) ?? {};
  const fallbackItems = Array.isArray(value) ? value : [];
  const relatedProfiles = normalizeProfiles(
    record.related_profiles ??
      record.related ??
      record.profiles ??
      record.users ??
      record.items ??
      record.data ??
      fallbackItems
  );
  const total = asNumber(record.total) ?? asNumber(record.count);

  return {
    ...record,
    pubkey: asString(record.pubkey) ?? asString(record.author_pubkey),
    related_profiles: dedupeProfilesByPubkey(relatedProfiles),
    total: total ?? relatedProfiles.length,
  };
}
