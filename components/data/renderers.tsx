import { HashtagChip } from "@/components/explorer/hashtag-chip";
import { NoteCard } from "@/components/explorer/note-card";
import { ProfileCard } from "@/components/explorer/profile-card";
import type { EventRecord, Profile } from "@/lib/types/api";

function getAuthorByPubkey(
  authorsByPubkey: Record<string, Profile> | undefined,
  pubkey: unknown
): Profile | undefined {
  if (!authorsByPubkey || typeof pubkey !== "string") return undefined;
  const normalized = pubkey.trim().toLowerCase();
  return authorsByPubkey[normalized] ?? authorsByPubkey[pubkey];
}

export function NotesList({
  notes,
  authorsByPubkey,
  ranked = false,
  showFullContent = false,
}: {
  notes: EventRecord[];
  authorsByPubkey?: Record<string, Profile>;
  ranked?: boolean;
  showFullContent?: boolean;
}) {
  return (
    <ul className="space-y-3">
      {notes.map((note, index) => (
        <li key={note.id ?? `note-${index}`}>
          <NoteCard
            note={note}
            author={getAuthorByPubkey(authorsByPubkey, note.pubkey)}
            rank={ranked ? index + 1 : undefined}
            showFullContent={showFullContent}
          />
        </li>
      ))}
    </ul>
  );
}

export function ProfilesList({
  profiles,
  ranked = false,
}: {
  profiles: Profile[];
  ranked?: boolean;
}) {
  return (
    <ul className="space-y-3">
      {profiles.map((profile, index) => (
        <li key={profile.pubkey ?? profile.npub ?? `profile-${index}`}>
          <ProfileCard profile={profile} rank={ranked ? index + 1 : undefined} />
        </li>
      ))}
    </ul>
  );
}

export function HashtagsList({
  hashtags,
  ranked = false,
  searchable = false,
}: {
  hashtags: Array<string | { hashtag?: string; count?: number }>;
  ranked?: boolean;
  searchable?: boolean;
}) {
  const normalized = hashtags.map((entry, index) => {
    const hashtag = typeof entry === "string" ? entry : (entry.hashtag ?? "");
    const count = typeof entry === "string" ? undefined : entry.count;
    const href = searchable ? `/search?q=${encodeURIComponent(`#${hashtag}`)}&tab=all` : undefined;
    return {
      hashtag: hashtag || "unknown",
      count,
      href,
      rank: ranked ? index + 1 : undefined,
    };
  });
  const top = ranked ? normalized.slice(0, 3) : [];
  const rest = ranked ? normalized.slice(3) : normalized;

  return (
    <div className="space-y-2">
      {top.length > 0 ? (
        <ul className="grid gap-2 sm:grid-cols-3">
          {top.map((entry, index) => (
            <li key={`${entry.hashtag}-${index}`}>
              <HashtagChip
                hashtag={entry.hashtag}
                count={entry.count}
                href={entry.href}
                rank={entry.rank}
              />
            </li>
          ))}
        </ul>
      ) : null}
      <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {rest.map((entry, index) => (
          <li key={`${entry.hashtag}-${index}`}>
            <HashtagChip
              hashtag={entry.hashtag}
              count={entry.count}
              href={entry.href}
              rank={entry.rank}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
