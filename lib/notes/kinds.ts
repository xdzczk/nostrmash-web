export const PICTURE_KIND = 20;
export const VIDEO_KIND = 21;
export const SHORT_VIDEO_KIND = 22;
export const GENERIC_REPOST_KIND = 16;
export const COMMENT_KIND = 1111;
export const REPORT_KIND = 1984;
export const LIVE_ACTIVITY_KIND = 30311;
export const ADDRESSABLE_VIDEO_KIND = 34235;
export const ADDRESSABLE_SHORT_KIND = 34236;

const MEDIA_KINDS = new Set([
  PICTURE_KIND,
  VIDEO_KIND,
  SHORT_VIDEO_KIND,
  ADDRESSABLE_VIDEO_KIND,
  ADDRESSABLE_SHORT_KIND,
]);

const SHORT_KINDS = new Set([SHORT_VIDEO_KIND, ADDRESSABLE_SHORT_KIND]);

const ADDRESSABLE_MEDIA_KINDS = new Set([ADDRESSABLE_VIDEO_KIND, ADDRESSABLE_SHORT_KIND]);

/** Kinds a kind-16 repost may unwrap into a matching card. */
const GENERIC_REPOST_INNER_KINDS = new Set([
  1,
  PICTURE_KIND,
  VIDEO_KIND,
  SHORT_VIDEO_KIND,
  30023,
  ADDRESSABLE_VIDEO_KIND,
  ADDRESSABLE_SHORT_KIND,
]);

export function isMediaKind(kind: number | undefined): boolean {
  return typeof kind === "number" && MEDIA_KINDS.has(kind);
}

export function isShortVideoKind(kind: number | undefined): boolean {
  return typeof kind === "number" && SHORT_KINDS.has(kind);
}

export function isAddressableMediaKind(kind: number | undefined): boolean {
  return typeof kind === "number" && ADDRESSABLE_MEDIA_KINDS.has(kind);
}

export function isLiveActivityKind(kind: number | undefined): boolean {
  return kind === LIVE_ACTIVITY_KIND;
}

export function isGenericRepostInnerKind(kind: number | undefined): boolean {
  return typeof kind === "number" && GENERIC_REPOST_INNER_KINDS.has(kind);
}

export function noteKindLabel(kind: number): string {
  switch (kind) {
    case 1:
      return "Note";
    case 6:
    case GENERIC_REPOST_KIND:
      return "Repost";
    case PICTURE_KIND:
      return "Picture";
    case VIDEO_KIND:
    case ADDRESSABLE_VIDEO_KIND:
      return "Video";
    case SHORT_VIDEO_KIND:
    case ADDRESSABLE_SHORT_KIND:
      return "Short video";
    case COMMENT_KIND:
      return "Comment";
    case REPORT_KIND:
      return "Report";
    case 30023:
      return "Long-form";
    case LIVE_ACTIVITY_KIND:
      return "Live activity";
    default:
      return `Kind ${kind}`;
  }
}

export function eventIdOf(event: {
  id?: unknown;
  event_id?: unknown;
  eventId?: unknown;
}): string | undefined {
  if (typeof event.id === "string" && event.id.length > 0) return event.id;
  if (typeof event.event_id === "string" && event.event_id.length > 0) return event.event_id;
  if (typeof event.eventId === "string" && event.eventId.length > 0) return event.eventId;
  return undefined;
}

export function eventPageHref(event: {
  id?: unknown;
  event_id?: unknown;
  eventId?: unknown;
}): string | undefined {
  const id = eventIdOf(event);
  return id ? `/notes/${encodeURIComponent(id)}` : undefined;
}
