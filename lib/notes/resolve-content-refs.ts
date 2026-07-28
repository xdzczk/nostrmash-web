import { getEventsBatch } from "@/lib/api/endpoints/notes";
import { getProfilesBatch } from "@/lib/api/endpoints/profiles";
import type { NoteContentResolution } from "@/components/explorer/note-content";
import { collectTokenReferences, tokenizeNoteContent, type NoteToken } from "@/lib/notes/tokenize";
import type { EventRecord, Profile } from "@/lib/types/api";

export async function resolveContentReferences(
  contents: string[],
  options?: { maxPubkeys?: number; maxEvents?: number }
): Promise<NoteContentResolution> {
  const tokens: NoteToken[] = contents.flatMap((content) => tokenizeNoteContent(content));
  const refs = collectTokenReferences(tokens);
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
