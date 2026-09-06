import { getEventsBatch } from "@/lib/api/endpoints/notes";
import { getProfilesBatch } from "@/lib/api/endpoints/profiles";
import type { NoteContentResolution } from "@/components/explorer/note-content";
import {
  collectHandleSupportReferences,
  collectTokenReferences,
  tokenizeNoteContent,
} from "@/lib/notes/tokenize";
import type { EventRecord, Profile } from "@/lib/types/api";

export type ContentRefInput = string | { content?: unknown; tags?: unknown };

function asContentInput(input: ContentRefInput): { content: string; tags?: unknown } {
  if (typeof input === "string") return { content: input };
  return {
    content: typeof input.content === "string" ? input.content : "",
    tags: input.tags,
  };
}

export function collectContentReferences(inputs: ContentRefInput[]): {
  pubkeys: string[];
  eventIds: string[];
} {
  const pubkeys = new Set<string>();
  const eventIds = new Set<string>();

  for (const input of inputs) {
    const { content, tags } = asContentInput(input);
    const tokens = tokenizeNoteContent(content, { tags });
    const refs = collectTokenReferences(tokens);
    refs.pubkeys.forEach((pubkey) => pubkeys.add(pubkey));
    refs.eventIds.forEach((eventId) => eventIds.add(eventId));
    if (tokens.some((token) => token.type === "handle")) {
      const extras = collectHandleSupportReferences(tags);
      extras.pubkeys.forEach((pubkey) => pubkeys.add(pubkey));
      extras.eventIds.forEach((eventId) => eventIds.add(eventId));
    }
  }

  return { pubkeys: [...pubkeys], eventIds: [...eventIds] };
}

export async function resolveContentReferences(
  inputs: ContentRefInput[],
  options?: { maxPubkeys?: number; maxEvents?: number }
): Promise<NoteContentResolution> {
  const refs = collectContentReferences(inputs);
  const maxPubkeys = options?.maxPubkeys ?? 40;
  const maxEvents = options?.maxEvents ?? 20;

  const [profiles, eventsResult] = await Promise.all([
    refs.pubkeys.length > 0
      ? getProfilesBatch(refs.pubkeys.slice(0, maxPubkeys), "shortTtl").catch(() => [] as Profile[])
      : Promise.resolve([] as Profile[]),
    refs.eventIds.length > 0
      ? getEventsBatch(refs.eventIds.slice(0, maxEvents), "shortTtl").catch(() => ({
          events: [] as EventRecord[],
          missing: [] as string[],
        }))
      : Promise.resolve({ events: [] as EventRecord[], missing: [] as string[] }),
  ]);

  const profilesByPubkey: Record<string, Profile | undefined> = {};
  for (const profile of profiles) {
    if (typeof profile.pubkey === "string" && profile.pubkey) {
      profilesByPubkey[profile.pubkey.toLowerCase()] = profile;
    }
  }

  const eventsById: Record<string, EventRecord | undefined> = {};
  for (const event of eventsResult.events) {
    const id =
      (typeof event.id === "string" && event.id) ||
      (typeof event.event_id === "string" && event.event_id) ||
      "";
    if (id) eventsById[id.toLowerCase()] = event;
  }

  return { profilesByPubkey, eventsById };
}
