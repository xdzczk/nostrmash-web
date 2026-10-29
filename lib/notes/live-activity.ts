import { encodeNaddr } from "@/lib/nostr/nip19";
import { eventTagRows, firstTagValue, tagValues } from "@/lib/notes/event-tags";
import { isLiveActivityKind } from "@/lib/notes/kinds";
import { preferPlayableStream } from "@/lib/notes/live-playback";
import type { EventRecord } from "@/lib/types/api";

export type LiveStatus = "planned" | "live" | "ended";
export type LiveRole = "Host" | "Speaker" | "Participant";

export type LiveParticipant = {
  pubkey: string;
  role: LiveRole;
};

export type LivePresentation = {
  title: string;
  summary?: string;
  image?: string;
  status?: LiveStatus;
  starts?: number;
  ends?: number;
  streaming?: string;
  recording?: string;
  participants: LiveParticipant[];
  /** `d` tag, the stable addressable id. */
  identifier?: string;
  naddr?: string;
};

const ROLES = new Map<string, LiveRole>([
  ["host", "Host"],
  ["speaker", "Speaker"],
  ["participant", "Participant"],
]);

function httpsUrl(value: string | undefined): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "https:") return undefined;
    return url.toString();
  } catch {
    return undefined;
  }
}

function unixSeconds(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const parsed = Number(value.trim());
  if (!Number.isFinite(parsed) || parsed <= 0) return undefined;
  return parsed;
}

function liveStatus(value: string | undefined): LiveStatus | undefined {
  const normalized = value?.trim().toLowerCase();
  if (normalized === "planned" || normalized === "live" || normalized === "ended")
    return normalized;
  return undefined;
}

function roleInTag(tag: string[]): LiveRole | undefined {
  for (let index = 2; index < tag.length; index += 1) {
    const role = ROLES.get((tag[index] ?? "").trim().toLowerCase());
    if (role) return role;
  }
  return undefined;
}

export function getLivePresentation(
  event: EventRecord | null | undefined
): LivePresentation | null {
  if (!event || !isLiveActivityKind(event.kind)) return null;
  const tags = event.tags;
  const title = firstTagValue(tags, "title")?.trim() || "Live activity";
  const summary = firstTagValue(tags, "summary")?.trim();
  const identifier = firstTagValue(tags, "d")?.trim();
  const pubkey = typeof event.pubkey === "string" ? event.pubkey.trim().toLowerCase() : "";
  const participants: LiveParticipant[] = [];
  const seen = new Set<string>();
  for (const tag of eventTagRows(tags)) {
    if ((tag[0] ?? "").toLowerCase() !== "p") continue;
    const pubkeyValue = tag[1]?.trim().toLowerCase();
    const role = roleInTag(tag);
    if (!pubkeyValue || !role || seen.has(`${pubkeyValue}:${role}`)) continue;
    seen.add(`${pubkeyValue}:${role}`);
    participants.push({ pubkey: pubkeyValue, role });
  }
  const naddr =
    identifier && /^[0-9a-f]{64}$/.test(pubkey)
      ? (encodeNaddr({ identifier, pubkey, kind: event.kind ?? 30311 }) ?? undefined)
      : undefined;

  return {
    title,
    summary: summary && summary.length > 0 ? summary : undefined,
    image: httpsUrl(firstTagValue(tags, "image")),
    status: liveStatus(firstTagValue(tags, "status")),
    starts: unixSeconds(firstTagValue(tags, "starts")),
    ends: unixSeconds(firstTagValue(tags, "ends")),
    streaming: preferPlayableStream(tagValues(tags, "streaming")),
    recording: httpsUrl(firstTagValue(tags, "recording")),
    participants,
    identifier: identifier && identifier.length > 0 ? identifier : undefined,
    naddr,
  };
}

export function liveActivityNaddr(event: EventRecord | null | undefined): string | null {
  return getLivePresentation(event)?.naddr ?? null;
}
