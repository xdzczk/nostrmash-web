import { HashtagChip } from "@/components/explorer/hashtag-chip";
import { NoteCard } from "@/components/explorer/note-card";
import { ProfileCard } from "@/components/explorer/profile-card";
import type { EventRecord, Profile } from "@/lib/types/api";

export function NotesList({
  notes,
  ranked = false,
  showFullContent = false,
}: {
  notes: EventRecord[];
  ranked?: boolean;
  showFullContent?: boolean;
}) {
  return (
    <ul className="space-y-3">
      {notes.map((note, index) => (
        <li key={note.id ?? `note-${index}`}>
          <NoteCard
            note={note}
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
  return (
    <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {hashtags.map((entry, index) => {
        const hashtag = typeof entry === "string" ? entry : (entry.hashtag ?? "");
        const count = typeof entry === "string" ? undefined : entry.count;
        const href = searchable
          ? `/search?q=${encodeURIComponent(`#${hashtag}`)}&tab=all&window=7d`
          : undefined;
        return (
          <li key={`${hashtag}-${index}`}>
            <HashtagChip
              hashtag={hashtag || "unknown"}
              count={count}
              href={href}
              rank={ranked ? index + 1 : undefined}
            />
          </li>
        );
      })}
    </ul>
  );
}
