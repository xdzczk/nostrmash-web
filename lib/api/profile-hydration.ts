import { getProfile, getProfilesBatch } from "@/lib/api/endpoints";
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

export function hasRichIdentity(profile: Profile | undefined): boolean {
  if (!profile) return false;
  const fields = [
    profile.display_name,
    profile.name,
    profile.picture,
    profile.about,
    profile.nip05,
  ];
  return fields.some((value) => typeof value === "string" && value.trim().length > 0);
}

export async function fetchProfilesByPubkey(
  pubkeys: Array<string | null | undefined>,
  cacheClass: CacheClass = "requestTime"
): Promise<ProfilesByPubkey> {
  const normalizedPubkeys = listHydratablePubkeys(pubkeys);
  if (normalizedPubkeys.length === 0) return {};
  const profiles = await getProfilesBatch(normalizedPubkeys, cacheClass);
  const hydratedByPubkey = mapProfilesByPubkey(profiles);
  const missingOrSparsePubkeys = normalizedPubkeys.filter(
    (pubkey) => !hasRichIdentity(hydratedByPubkey[pubkey])
  );

  if (missingOrSparsePubkeys.length === 0) {
    return hydratedByPubkey;
  }

  const fallbackProfiles = await Promise.allSettled(
    missingOrSparsePubkeys.map((pubkey) => getProfile(pubkey, cacheClass))
  );
  for (const result of fallbackProfiles) {
    if (result.status !== "fulfilled") continue;
    const profile = result.value;
    if (typeof profile.pubkey !== "string" || profile.pubkey.length === 0) continue;
    hydratedByPubkey[profile.pubkey.toLowerCase()] = profile;
  }

  return hydratedByPubkey;
}

export async function hydrateProfiles(
  profiles: Profile[],
  cacheClass: CacheClass = "requestTime"
): Promise<Profile[]> {
  if (profiles.length === 0) return [];
  const sparseProfiles = profiles.filter((profile) => !hasRichIdentity(profile));
  if (sparseProfiles.length === 0) {
    return profiles;
  }
  const hydratedByPubkey = await fetchProfilesByPubkey(
    sparseProfiles.map((profile) => profile.pubkey),
    cacheClass
  );
  const hydratedByNpub: Record<string, Profile> = Object.fromEntries(
    Object.values(hydratedByPubkey)
      .filter((profile) => typeof profile.npub === "string" && profile.npub.length > 0)
      .map((profile) => [profile.npub!.toLowerCase(), profile])
  );

  const npubOnlyIdentifiers = Array.from(
    new Set(
      sparseProfiles
        .filter((profile) => {
          const hasPubkey = typeof profile.pubkey === "string" && profile.pubkey.length > 0;
          const hasNpub = typeof profile.npub === "string" && profile.npub.length > 0;
          return !hasPubkey && hasNpub;
        })
        .map((profile) => profile.npub!.toLowerCase())
    )
  );
  if (npubOnlyIdentifiers.length > 0) {
    const npubHydrationResults = await Promise.allSettled(
      npubOnlyIdentifiers.map((npub) => getProfile(npub, cacheClass))
    );
    for (const result of npubHydrationResults) {
      if (result.status !== "fulfilled") continue;
      const profile = result.value;
      if (typeof profile.pubkey === "string" && profile.pubkey.length > 0) {
        hydratedByPubkey[profile.pubkey.toLowerCase()] = profile;
      }
      if (typeof profile.npub === "string" && profile.npub.length > 0) {
        hydratedByNpub[profile.npub.toLowerCase()] = profile;
      }
    }
  }

  return profiles.map((profile) => {
    const key = typeof profile.pubkey === "string" ? profile.pubkey.toLowerCase() : "";
    const npubKey = typeof profile.npub === "string" ? profile.npub.toLowerCase() : "";
    const hydrated =
      (key ? hydratedByPubkey[key] : undefined) ?? (npubKey ? hydratedByNpub[npubKey] : undefined);
    return hydrated ? { ...profile, ...hydrated } : profile;
  });
}

export function extractEventAuthorPubkeys(notes: EventRecord[]): string[] {
  return listHydratablePubkeys(notes.map((note) => note.pubkey));
}
