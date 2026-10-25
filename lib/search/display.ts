import type { EventRecord, Profile, SearchResponse } from "@/lib/types/api";

const OFFSET_TOKEN_PREFIX = "offset:";

export function displayQuery(query: string): string {
  const trimmed = query.trim();
  if (
    trimmed.length >= 2 &&
    ((trimmed.startsWith('"') && trimmed.endsWith('"')) ||
      (trimmed.startsWith("“") && trimmed.endsWith("”")))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

export function searchResultSubtitle(
  query: string,
  payload: Pick<SearchResponse, "total" | "totals_source" | "section_totals"> | null
): string {
  const label = displayQuery(query);
  if (payload?.totals_source === "api") {
    const notes = payload.section_totals?.notes;
    if (typeof notes === "number") {
      return `About ${notes.toLocaleString()} notes mention ${label}.`;
    }
    if (typeof payload.total === "number") {
      return `About ${payload.total.toLocaleString()} results for ${label}.`;
    }
  }
  return "Top matches across notes, people, topics, and relays.";
}

export function formatCompactCount(value: number): string {
  const abs = Math.abs(value);
  if (abs < 1000) return Math.round(value).toLocaleString();
  const unit =
    abs < 1_000_000
      ? { div: 1_000, suffix: "K" }
      : abs < 1_000_000_000
        ? { div: 1_000_000, suffix: "M" }
        : { div: 1_000_000_000, suffix: "B" };
  const scaled = value / unit.div;
  const rounded = Math.abs(scaled) >= 100 ? Math.round(scaled) : Math.round(scaled * 10) / 10;
  return `${Number.isInteger(rounded) ? String(rounded) : String(rounded)}${unit.suffix}`;
}

/** One line under a search profile: followers, recent notes, and nip05. */
export function searchProfileContextLine(
  profile: Pick<Profile, "follower_count" | "recent_post_count" | "nip05">,
  options?: { omitNip05?: boolean }
): string | undefined {
  const parts: string[] = [];
  if (typeof profile.follower_count === "number" && profile.follower_count > 0) {
    const noun = profile.follower_count === 1 ? "follower" : "followers";
    parts.push(`${formatCompactCount(profile.follower_count)} ${noun}`);
  }
  if (typeof profile.recent_post_count === "number" && profile.recent_post_count > 0) {
    const noun = profile.recent_post_count === 1 ? "note" : "notes";
    parts.push(`${profile.recent_post_count.toLocaleString()} ${noun} this week`);
  }
  const nip05 = typeof profile.nip05 === "string" ? profile.nip05.trim() : "";
  if (nip05 && !options?.omitNip05) parts.push(nip05);
  return parts.length > 0 ? parts.join(" · ") : undefined;
}

export function encodeOffsetToken(offset: number): string {
  return `${OFFSET_TOKEN_PREFIX}${offset}`;
}

export function decodeContinuation(token: string): { cursor?: string; offset?: number } {
  if (token.startsWith(OFFSET_TOKEN_PREFIX)) {
    const offset = Number.parseInt(token.slice(OFFSET_TOKEN_PREFIX.length), 10);
    if (Number.isFinite(offset) && offset >= 0) return { offset };
  }
  return { cursor: token };
}

/** Cursor when the index sent one, otherwise an offset token when the page is full. */
export function continuationToken(
  cursor: string | undefined,
  count: number,
  limit: number
): string | undefined {
  if (typeof cursor === "string" && cursor.length > 0) return cursor;
  if (count >= limit) return encodeOffsetToken(count);
  return undefined;
}

function identityEquals(profile: Profile, token: string): boolean {
  const name = (profile.name ?? "").trim().toLowerCase();
  const displayName = (profile.display_name ?? "").trim().toLowerCase();
  const nip05 = (profile.nip05 ?? "").trim().toLowerCase();
  const local = nip05.split("@")[0] ?? "";
  return (
    name === token ||
    displayName === token ||
    nip05 === token ||
    (local.length > 0 && local === token)
  );
}

/**
 * A single-token query that matches exactly one profile's name, display name,
 * or nip05 should lead with people. Several exact matches (twenty accounts
 * named Bitcoin) stay behind notes.
 */
export function leadsWithExactProfile(query: string, profiles: Profile[]): boolean {
  const token = query.trim().replace(/^@/, "").toLowerCase();
  if (!token || /\s/.test(token)) return false;
  const matches = profiles.filter((profile) => identityEquals(profile, token));
  return matches.length === 1;
}

export function collapseRepeatedAuthors(
  notes: EventRecord[],
  maxPerAuthor = 2
): { notes: EventRecord[]; extras: Array<{ pubkey: string; hidden: number }> } {
  const seen = new Map<string, number>();
  const hidden = new Map<string, number>();
  const kept: EventRecord[] = [];

  for (const note of notes) {
    const pubkey = typeof note.pubkey === "string" ? note.pubkey.trim().toLowerCase() : "";
    if (!pubkey) {
      kept.push(note);
      continue;
    }
    const count = seen.get(pubkey) ?? 0;
    if (count < maxPerAuthor) {
      kept.push(note);
      seen.set(pubkey, count + 1);
    } else {
      hidden.set(pubkey, (hidden.get(pubkey) ?? 0) + 1);
    }
  }

  return {
    notes: kept,
    extras: [...hidden.entries()].map(([pubkey, count]) => ({ pubkey, hidden: count })),
  };
}
