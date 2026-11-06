import type { ContentLengthBucket, HashtagMomentumStatus } from "@/lib/types/surfaces";

/** width_bucket indices 0–5 over thresholds 1, 7, 30, 90, and 365 days. */
export const ACCOUNT_AGE_LABELS = [
  "<1 day",
  "1–7 days",
  "7–30 days",
  "30–90 days",
  "90–365 days",
  "1 year+",
] as const;

export function accountAgeLabel(bucket: number): string {
  return ACCOUNT_AGE_LABELS[bucket] ?? `Bucket ${bucket}`;
}

export const CONTENT_LENGTH_LABELS: Record<ContentLengthBucket, string> = {
  "0_80": "Under 80 characters",
  "80_280": "80–279 characters",
  "280_1000": "280–999 characters",
  "1000_plus": "1,000 or more characters",
};

export const GROUP_SIZE_LABELS: Record<string, string> = {
  "0": "0",
  "1_9": "1–9",
  "10_49": "10–49",
  "50_199": "50–199",
  "200_999": "200–999",
  "1000_plus": "1000+",
};

export const KIND_FAMILY_LABELS: Record<string, string> = {
  notes: "Notes",
  long_form: "Long-form",
  media: "Media",
  dms: "Messages",
  zaps: "Zaps",
  groups: "Groups",
  polls: "Polls",
  live: "Live",
  badges: "Badges",
  git: "Git",
  wiki: "Wiki",
  publications: "Publications",
  calendar: "Calendar",
  classifieds: "Classifieds",
  voice: "Voice",
  relay_monitors: "Relay monitors",
  moderation: "Moderation",
  dvm: "Data vending",
  lists: "Lists",
  other: "Other",
};

export function kindFamilyLabel(family: string): string {
  return KIND_FAMILY_LABELS[family] ?? family.replaceAll("_", " ");
}

export const LIST_KIND_LABELS: Record<number, string> = {
  10006: "Blocked relays",
  10007: "Search relays",
  10012: "Favorite relays",
  10013: "Private relays",
  10096: "File storage servers",
  10015: "Interests",
  30002: "Relay sets",
  30004: "Article curation",
  30005: "Bookmark curation",
  30015: "Interest sets",
};

export function listKindLabel(kind: number | undefined): string {
  if (typeof kind !== "number") return "List";
  return LIST_KIND_LABELS[kind] ?? `Kind ${kind}`;
}

export const WEEKDAY_LABELS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

export function weekdayLabel(day: number): string {
  return WEEKDAY_LABELS[day] ?? `Day ${day}`;
}

/** Short UTC day, shared by series fallbacks and headlines ("Nov 6"). */
export function formatUtcDay(timestampOrIso: number | string): string {
  const ms =
    typeof timestampOrIso === "number"
      ? timestampOrIso < 1e12
        ? timestampOrIso * 1000
        : timestampOrIso
      : Date.parse(`${timestampOrIso}T00:00:00Z`);
  if (!Number.isFinite(ms)) return String(timestampOrIso);
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(ms));
}

/** The index began recording on this day. Partial charts say so instead of looking finished. */
export const INDEX_COLLECTING_SINCE = "Collecting since Nov 5";

export function momentumLabel(status: HashtagMomentumStatus | undefined): string {
  if (status === "emerging") return "Emerging";
  if (status === "fading") return "Fading";
  if (status === "steady") return "Steady";
  return "Hashtag";
}

export function formatDurationSeconds(seconds: number): string {
  if (!Number.isFinite(seconds)) return "—";
  const absolute = Math.abs(seconds);
  if (absolute < 60) return `${Math.round(seconds).toLocaleString()} s`;
  if (absolute < 3600) {
    return `${(seconds / 60).toLocaleString(undefined, { maximumFractionDigits: 1 })} min`;
  }
  if (absolute < 86400) {
    return `${(seconds / 3600).toLocaleString(undefined, { maximumFractionDigits: 1 })} h`;
  }
  return `${(seconds / 86400).toLocaleString(undefined, { maximumFractionDigits: 1 })} d`;
}

export function formatScaledHundredths(value: number): string {
  return (value / 100).toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export const SERIES_EMPTY_MESSAGE =
  "This series is empty until the first UTC rollup runs. Nothing is recorded here yet.";

export function goalSats(amountMsats: number | undefined): number | null {
  if (typeof amountMsats !== "number" || !Number.isFinite(amountMsats) || amountMsats <= 0) {
    return null;
  }
  return amountMsats / 1000;
}

export function pollTypeLabel(pollType: string | undefined): string | null {
  if (!pollType) return null;
  if (pollType === "singlechoice") return "Single choice";
  if (pollType === "multiplechoice") return "Multiple choice";
  return pollType.replaceAll("_", " ");
}
