import type { Profile } from "@/lib/types/api";

export function dedupeProfiles(profiles: Profile[]): Profile[] {
  return Array.from(
    new Map(
      profiles
        .filter((profile) => typeof profile.pubkey === "string" && profile.pubkey.length > 0)
        .map((profile) => [profile.pubkey, profile])
    ).values()
  );
}
