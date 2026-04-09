import { getProfilesBatch } from "@/lib/api/endpoints";
import type { CacheClass } from "@/lib/caching/policies";
import type { EventRecord, Profile } from "@/lib/types/api";

export type ProfilesByPubkey = Record<string, Profile>;

export function listHydratablePubkeys(pubkeys: Array<string | null | undefined>): string[] {
  return Array.from(
    new Set(
      pubkeys
        .filter((pubkey): pubkey is string => typeof pubkey === "string" && pubkey.length > 0)
        .map((pubkey) => pubkey.toLowerCase())
    )
  );
}

export function mapProfilesByPubkey(profiles: Profile[]): ProfilesByPubkey {
  return Object.fromEntries(
    profiles
      .filter((profile) => typeof profile.pubkey === "string" && profile.pubkey.length > 0)
      .map((profile) => [profile.pubkey.toLowerCase(), profile])
  );
}

export async function fetchProfilesByPubkey(
  pubkeys: Array<string | null | undefined>,
  cacheClass: CacheClass = "requestTime"
): Promise<ProfilesByPubkey> {
  const normalizedPubkeys = listHydratablePubkeys(pubkeys);
  if (normalizedPubkeys.length === 0) return {};
  const profiles = await getProfilesBatch(normalizedPubkeys, cacheClass);
  return mapProfilesByPubkey(profiles);
}

export async function hydrateProfiles(
  profiles: Profile[],
  cacheClass: CacheClass = "requestTime"
): Promise<Profile[]> {
  if (profiles.length === 0) return [];
  const hydratedByPubkey = await fetchProfilesByPubkey(
    profiles.map((profile) => profile.pubkey),
    cacheClass
  );
  return profiles.map((profile) => {
    const key = typeof profile.pubkey === "string" ? profile.pubkey.toLowerCase() : "";
    return key ? { ...profile, ...(hydratedByPubkey[key] ?? {}) } : profile;
  });
}

export function extractEventAuthorPubkeys(notes: EventRecord[]): string[] {
  return listHydratablePubkeys(notes.map((note) => note.pubkey));
}
