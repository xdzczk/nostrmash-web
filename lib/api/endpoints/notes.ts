import type {
  BatchEventsApiResponse,
  EventAncestorsApiResponse,
  EventAncestorsResponse,
  EventCountsApiResponse,
  EventCountsResponse,
  EventDetailResponse,
  EventRecord,
  EventRepliesApiResponse,
  EventRepliesResponse,
  EventSeenOnApiResponse,
  EventSeenOnResponse,
  NoteSummaryApiResponse,
  RelatedNotesApiResponse,
  RelatedNotesResponse,
  ThreadActivityApiResponse,
  ThreadActivityResponse,
  ThreadApiResponse,
  ThreadSummaryApiResponse,
  ThreadSummaryResponse,
} from "@/lib/types/api";
import { fetchApiJson } from "@/lib/api/http";
import {
  normalizeEventAncestorsResponse,
  normalizeEventCountsResponse,
  normalizeEventRecords,
  normalizeEventRepliesResponse,
  normalizeEventSeenOnResponse,
  normalizeNoteSummaryResponse,
  normalizeRelatedNotesResponse,
  normalizeThreadActivityResponse,
  normalizeThreadResponse,
  normalizeThreadSummaryResponse,
} from "@/lib/api/normalize";
import type { CacheClass } from "@/lib/caching/policies";
import { buildCursorQuery, type CursorQuery, nativeApiV1Routes } from "@/lib/api/endpoints/shared";

const EVENTS_BATCH_MAX = 200;

export async function getEvent(eventId: string, cacheClass: CacheClass = "requestTime") {
  return fetchApiJson<EventDetailResponse>(nativeApiV1Routes.eventById(eventId), {
    cacheClass,
  });
}

export async function getEventsBatch(
  eventIds: string[],
  cacheClass: CacheClass = "requestTime"
): Promise<{ events: EventRecord[]; missing: string[] }> {
  const normalizedIds = Array.from(
    new Set(eventIds.map((id) => id.trim().toLowerCase()).filter((id) => id.length > 0))
  );
  if (normalizedIds.length === 0) {
    return { events: [], missing: [] };
  }

  const events: EventRecord[] = [];
  const missing: string[] = [];

  for (let offset = 0; offset < normalizedIds.length; offset += EVENTS_BATCH_MAX) {
    const chunk = normalizedIds.slice(offset, offset + EVENTS_BATCH_MAX);
    const response = await fetchApiJson<BatchEventsApiResponse>(nativeApiV1Routes.eventsBatch, {
      cacheClass,
      init: {
        method: "POST",
        body: JSON.stringify({ ids: chunk }),
        headers: { "Content-Type": "application/json" },
      },
    });
    events.push(...normalizeEventRecords(response.events));
    if (Array.isArray(response.missing)) {
      for (const id of response.missing) {
        if (typeof id === "string" && id.length > 0) missing.push(id.toLowerCase());
      }
    }
  }

  return { events, missing };
}

export async function getEventSeenOn(
  eventId: string,
  cacheClass: CacheClass = "requestTime"
): Promise<EventSeenOnResponse> {
  const response = await fetchApiJson<EventSeenOnApiResponse>(
    nativeApiV1Routes.eventSeenOnById(eventId),
    {
      cacheClass,
    }
  );
  return normalizeEventSeenOnResponse(response);
}

export async function getEventCounts(
  eventId: string,
  cacheClass: CacheClass = "requestTime"
): Promise<EventCountsResponse> {
  const response = await fetchApiJson<EventCountsApiResponse>(
    nativeApiV1Routes.eventCountsById(eventId),
    {
      cacheClass,
    }
  );
  return normalizeEventCountsResponse(response);
}

export async function getThread(eventId: string, cacheClass: CacheClass = "requestTime") {
  const response = await fetchApiJson<ThreadApiResponse>(
    nativeApiV1Routes.threadByEventId(eventId),
    {
      cacheClass,
    }
  );
  return normalizeThreadResponse(response);
}
export async function getEventAncestors(
  eventId: string,
  cacheClass: CacheClass = "requestTime",
  query?: CursorQuery
): Promise<EventAncestorsResponse> {
  const response = await fetchApiJson<EventAncestorsApiResponse>(
    nativeApiV1Routes.eventAncestorsById(eventId),
    {
      cacheClass,
      query: buildCursorQuery(query),
    }
  );
  return normalizeEventAncestorsResponse(response);
}

export async function getEventReplies(
  eventId: string,
  cacheClass: CacheClass = "requestTime",
  query?: CursorQuery
): Promise<EventRepliesResponse> {
  const response = await fetchApiJson<EventRepliesApiResponse>(
    nativeApiV1Routes.eventRepliesById(eventId),
    {
      cacheClass,
      query: buildCursorQuery(query),
    }
  );
  return normalizeEventRepliesResponse(response);
}

export async function getThreadSummary(
  rootEventId: string,
  cacheClass: CacheClass = "requestTime"
): Promise<ThreadSummaryResponse> {
  const response = await fetchApiJson<ThreadSummaryApiResponse>(
    nativeApiV1Routes.threadSummaryByRootEventId(rootEventId),
    {
      cacheClass,
    }
  );
  return normalizeThreadSummaryResponse(response);
}

export async function getThreadActivity(
  rootEventId: string,
  cacheClass: CacheClass = "requestTime",
  query?: CursorQuery
): Promise<ThreadActivityResponse> {
  const response = await fetchApiJson<ThreadActivityApiResponse>(
    nativeApiV1Routes.threadActivityByRootEventId(rootEventId),
    {
      cacheClass,
      query: buildCursorQuery(query),
    }
  );
  return normalizeThreadActivityResponse(response);
}

export async function getRelatedNotes(
  eventId: string,
  cacheClass: CacheClass = "requestTime",
  query?: CursorQuery
): Promise<RelatedNotesResponse> {
  const response = await fetchApiJson<RelatedNotesApiResponse>(
    nativeApiV1Routes.noteRelatedByEventId(eventId),
    {
      cacheClass,
      query: buildCursorQuery(query),
    }
  );
  return normalizeRelatedNotesResponse(response);
}

export async function getNoteSummary(eventId: string, cacheClass: CacheClass = "requestTime") {
  const response = await fetchApiJson<NoteSummaryApiResponse>(
    nativeApiV1Routes.noteSummaryByEventId(eventId),
    {
      cacheClass,
    }
  );
  return normalizeNoteSummaryResponse(response);
}
