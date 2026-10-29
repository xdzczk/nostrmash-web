import { asArray, asRecord, asString, compactDefined } from "@/lib/api/normalize/helpers";
import { normalizeEventRecord, normalizeEventRecords } from "@/lib/api/normalize/entities";
import { COMMENT_KIND } from "@/lib/notes/kinds";
import { normalizeReportRecords } from "@/lib/notes/reports";
import type {
  EventCommentsResponse,
  LiveActivitiesResponse,
  PinItem,
  ReportsResponse,
  UserLiveActivitiesResponse,
  UserMediaResponse,
  UserPinsResponse,
} from "@/lib/types/api";

function eventItems(record: Record<string, unknown>, value: unknown): unknown {
  return (
    record.items ??
    record.events ??
    record.notes ??
    record.data ??
    (Array.isArray(value) ? value : [])
  );
}

export function normalizeUserMediaResponse(value: unknown): UserMediaResponse {
  const record = asRecord(value) ?? {};
  const events = normalizeEventRecords(eventItems(record, value));
  return compactDefined({
    ...record,
    pubkey: asString(record.pubkey) ?? asString(record.author_pubkey),
    events,
  });
}

export function normalizeUserLiveActivitiesResponse(value: unknown): UserLiveActivitiesResponse {
  const record = asRecord(value) ?? {};
  const events = normalizeEventRecords(eventItems(record, value));
  return compactDefined({
    ...record,
    pubkey: asString(record.pubkey) ?? asString(record.author_pubkey),
    events,
  });
}

export function normalizeLiveActivitiesResponse(value: unknown): LiveActivitiesResponse {
  const record = asRecord(value) ?? {};
  const events = normalizeEventRecords(record.items ?? record.events ?? record.activities ?? []);
  return compactDefined({
    ...record,
    events,
  });
}

function normalizePinItem(value: unknown): PinItem | null {
  const record = asRecord(value);
  if (!record) return null;
  const tag = asString(record.tag)?.toLowerCase();
  const pinValue = asString(record.value);
  if ((tag !== "e" && tag !== "a") || !pinValue) return null;
  return { tag, value: pinValue };
}

export function normalizeUserPinsResponse(value: unknown): UserPinsResponse {
  const record = asRecord(value) ?? {};
  const items = asArray(record.items ?? record.pins ?? (Array.isArray(value) ? value : []))
    .map(normalizePinItem)
    .filter((item): item is PinItem => item !== null);
  return compactDefined({
    ...record,
    pubkey: asString(record.pubkey) ?? asString(record.author_pubkey),
    items,
  });
}

export function normalizeEventCommentsResponse(value: unknown): EventCommentsResponse {
  const record = asRecord(value) ?? {};
  const comments = asArray(record.items ?? record.comments ?? record.events)
    .map((entry) => normalizeEventRecord(entry))
    .filter(
      (event): event is NonNullable<ReturnType<typeof normalizeEventRecord>> =>
        event !== null && event.kind === COMMENT_KIND
    );
  return compactDefined({
    ...record,
    event_id: asString(record.event_id),
    comments,
  });
}

export function normalizeReportsResponse(value: unknown): ReportsResponse {
  const record = asRecord(value) ?? {};
  const reports = normalizeReportRecords(record.items ?? record.reports ?? record.events);
  return compactDefined({
    ...record,
    event_id: asString(record.event_id),
    pubkey: asString(record.pubkey),
    reports,
  });
}
