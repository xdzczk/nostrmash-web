import Link from "next/link";

import type { EventRecord, Profile } from "@/lib/types/api";

export function NotesList({ notes }: { notes: EventRecord[] }) {
  return (
    <ul className="space-y-2">
      {notes.map((note, index) => (
        <li key={note.id ?? `note-${index}`} className="rounded-md border border-zinc-800 p-3">
          <div className="mb-1 text-xs text-zinc-500">
            {note.pubkey ? `pubkey ${note.pubkey}` : "unknown author"}
            {typeof note.created_at === "number"
              ? ` · ${new Date(note.created_at * 1000).toISOString()}`
              : ""}
          </div>
          <p className="line-clamp-3 text-sm text-zinc-200">
            {typeof note.content === "string" && note.content.length > 0
              ? note.content
              : "(no content)"}
          </p>
          {note.id ? (
            <Link
              href={`/notes/${encodeURIComponent(note.id)}`}
              className="mt-2 inline-block text-xs text-indigo-300 hover:text-indigo-200"
            >
              Open note
            </Link>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

export function ProfilesList({ profiles }: { profiles: Profile[] }) {
  return (
    <ul className="space-y-2">
      {profiles.map((profile, index) => {
        const label = profile.display_name ?? profile.name ?? profile.npub ?? profile.pubkey;
        const identifier = profile.npub ?? profile.pubkey;
        return (
          <li
            key={profile.pubkey ?? profile.npub ?? `profile-${index}`}
            className="rounded-md border border-zinc-800 p-3"
          >
            <p className="text-sm font-medium text-zinc-100">{label ?? "Unknown profile"}</p>
            <p className="mt-1 text-xs text-zinc-500">{profile.pubkey ?? "No pubkey in payload"}</p>
            {identifier ? (
              <Link
                href={`/profiles/${encodeURIComponent(identifier)}`}
                className="mt-2 inline-block text-xs text-indigo-300 hover:text-indigo-200"
              >
                Open profile
              </Link>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

export function HashtagsList({
  hashtags,
}: {
  hashtags: Array<string | { hashtag?: string; count?: number }>;
}) {
  return (
    <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {hashtags.map((entry, index) => {
        const hashtag = typeof entry === "string" ? entry : entry.hashtag ?? "";
        const count = typeof entry === "string" ? undefined : entry.count;
        return (
          <li key={`${hashtag}-${index}`} className="rounded-md border border-zinc-800 p-3">
            <p className="text-sm font-medium text-zinc-100">#{hashtag || "unknown"}</p>
            <p className="mt-1 text-xs text-zinc-500">
              {typeof count === "number" ? `${count} mentions` : "no count"}
            </p>
          </li>
        );
      })}
    </ul>
  );
}
