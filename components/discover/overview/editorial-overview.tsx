import Link from "next/link";

import { ProfileAvatar } from "@/components/explorer/profile-avatar";
import { Timestamp } from "@/components/explorer/timestamp";
import {
  mapDomainWhyNow,
  mapHashtagWhyNow,
  mapNoteWhyNow,
  mapProfileWhyNow,
  type WhyNowReason,
} from "@/components/explorer/why-now";
import {
  formatCompactNumber,
  normalizeDomainLabel,
  noteAuthorIdentifier,
  noteInlineAuthorProfile,
  profileIdentifier,
  profileLabel,
  profileSecondaryLabel,
  truncateIdentifier,
} from "@/components/explorer/utils";
import { getEditorialNoteText } from "@/components/explorer/note-preview";
import { NetworkPulseStrip } from "@/components/home/network-pulse-strip";
import type { StatsWindow } from "@/lib/search-params/window";
import type { DomainEntry, EventRecord, HashtagEntry, Profile } from "@/lib/types/api";

type PulseStat = {
  label: string;
  value: string | number | boolean;
  series?: Array<{ t: number; v: number }>;
};

function firstReason(reasons: WhyNowReason[]): WhyNowReason | null {
  return reasons[0] ?? null;
}

function EvidenceLine({ reasons }: { reasons: WhyNowReason[] }) {
  const reason = firstReason(reasons);
  if (!reason) return null;
  return (
    <p className="text-ink-muted mt-3 text-xs leading-5">
      <span className="text-ink-faint mr-2 font-medium tracking-[0.12em] uppercase">Why now</span>
      <span className="text-ink">{reason.text}</span>
      {reason.support ? <span className="text-ink-faint"> · {reason.support}</span> : null}
    </p>
  );
}

function noteId(note: EventRecord): string | null {
  const candidate = note.id ?? note.event_id ?? note.eventId;
  return typeof candidate === "string" && candidate.length > 0 ? candidate : null;
}

function noteAuthor(note: EventRecord, authorsByPubkey: Record<string, Profile>) {
  const inline = noteInlineAuthorProfile(note);
  if (inline) return inline;
  if (typeof note.pubkey !== "string") return undefined;
  return authorsByPubkey[note.pubkey.toLowerCase()] ?? authorsByPubkey[note.pubkey];
}

function authorName(note: EventRecord, author?: Profile) {
  return author ? profileLabel(author) : noteAuthorIdentifier(note);
}

function EditorialNote({
  note,
  rank,
  authorsByPubkey,
  lead = false,
}: {
  note: EventRecord;
  rank: number;
  authorsByPubkey: Record<string, Profile>;
  lead?: boolean;
}) {
  const author = noteAuthor(note, authorsByPubkey);
  const id = noteId(note);
  const editorialText = getEditorialNoteText(note);

  return (
    <article
      className={
        lead
          ? "border-edge/80 relative border-l-2 border-l-[var(--accent-soft)] py-1 pl-6 sm:pl-8"
          : "border-edge/70 border-t py-6 first:border-t-0"
      }
    >
      <div className="flex items-center justify-between gap-4">
        <span
          className={
            lead
              ? "text-accent-ink text-4xl font-medium tracking-[-0.08em]"
              : "text-accent-ink text-xl font-medium tracking-[-0.05em]"
          }
          aria-label={`Rank ${rank}`}
        >
          {String(rank).padStart(2, "0")}
        </span>
        {!lead && id ? (
          <Link
            href={`/notes/${encodeURIComponent(id)}`}
            className="text-ink-muted hover:text-ink text-xs"
          >
            Open note
          </Link>
        ) : null}
      </div>

      <div className={lead ? "mt-5" : "mt-3"}>
        <div className="flex items-center gap-3">
          {author ? (
            <ProfileAvatar
              profile={author}
              size={lead ? 44 : 36}
              className={`${lead ? "h-11 w-11" : "h-9 w-9"} border-edge rounded-full border object-cover`}
            />
          ) : null}
          <div className="min-w-0">
            <p className="text-ink truncate text-sm font-medium">{authorName(note, author)}</p>
            <Timestamp unixSeconds={note.created_at} className="text-[11px]" />
          </div>
        </div>

        <p
          className={
            lead
              ? "text-ink-strong mt-5 line-clamp-8 max-w-[44rem] text-[clamp(1.3rem,2vw,1.95rem)] leading-[1.38] tracking-[-0.025em] [overflow-wrap:anywhere] whitespace-pre-wrap"
              : "text-ink-dim mt-4 line-clamp-4 text-[15px] leading-6 [overflow-wrap:anywhere] whitespace-pre-wrap"
          }
        >
          {editorialText}
        </p>
        <EvidenceLine reasons={mapNoteWhyNow(note)} />
        {lead && id ? (
          <Link
            href={`/notes/${encodeURIComponent(id)}`}
            className="text-ink hover:text-accent-ink mt-5 inline-flex min-h-11 items-center text-sm font-medium underline decoration-[var(--accent-soft)] underline-offset-4"
          >
            Read the leading note
          </Link>
        ) : null}
      </div>
    </article>
  );
}

function ProfileRanking({
  profiles,
  degraded,
  window,
}: {
  profiles: Profile[];
  degraded?: boolean;
  window: StatsWindow;
}) {
  return (
    <section aria-labelledby="profiles-in-motion">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="nm-kicker">People</p>
          <h2 id="profiles-in-motion" className="nm-title text-ink mt-2">
            Profiles in motion
          </h2>
        </div>
        <Link
          href={`/trending/profiles?window=${window}`}
          className="text-ink-muted hover:text-ink text-xs"
        >
          Full ranking
        </Link>
      </div>
      {profiles.length > 0 ? (
        <ol className="border-edge/70 mt-6 divide-y divide-[var(--edge)] border-y">
          {profiles.slice(0, 4).map((profile, index) => {
            const identifier = profileIdentifier(profile);
            const href =
              identifier !== "unknown" ? `/profiles/${encodeURIComponent(identifier)}` : undefined;
            const secondary = profileSecondaryLabel(profile);
            return (
              <li
                key={profile.pubkey ?? profile.npub ?? index}
                className="grid grid-cols-[2.5rem_2.75rem_minmax(0,1fr)] gap-3 py-5"
              >
                <span className="text-accent-ink pt-1 text-lg tabular-nums">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <ProfileAvatar
                  profile={profile}
                  size={44}
                  className="border-edge h-11 w-11 rounded-full border object-cover"
                />
                <div className="min-w-0">
                  {href ? (
                    <Link href={href} className="text-ink truncate font-medium hover:underline">
                      {profileLabel(profile)}
                    </Link>
                  ) : (
                    <p className="text-ink truncate font-medium">{profileLabel(profile)}</p>
                  )}
                  {secondary ? (
                    <p className="text-ink-faint mt-0.5 truncate text-xs">
                      {truncateIdentifier(secondary, "npub", "secondary")}
                    </p>
                  ) : null}
                  <EvidenceLine reasons={mapProfileWhyNow(profile)} />
                </div>
              </li>
            );
          })}
        </ol>
      ) : (
        <div className="border-edge/70 text-ink-muted mt-6 border-y py-8 text-sm">
          {degraded ? "Profile movement is temporarily unavailable." : "No clear profile movement."}
        </div>
      )}
    </section>
  );
}

function IdeasIndex({
  hashtags,
  domains,
  window,
}: {
  hashtags: HashtagEntry[];
  domains: DomainEntry[];
  window: StatsWindow;
}) {
  return (
    <section aria-labelledby="ideas-gaining-ground" className="space-y-9">
      <div>
        <p className="nm-kicker">Ideas</p>
        <h2 id="ideas-gaining-ground" className="nm-title text-ink mt-2">
          Gaining ground
        </h2>
        <div className="mt-5 flex flex-wrap gap-x-5 gap-y-3">
          {hashtags.slice(0, 8).map((entry, index) => {
            const hashtag = String(entry.hashtag ?? "").replace(/^#/, "");
            if (!hashtag) return null;
            const count = entry.count ?? entry.event_count;
            const reason = firstReason(mapHashtagWhyNow(entry));
            return (
              <Link
                key={`${hashtag}-${index}`}
                href={`/hashtags/${encodeURIComponent(hashtag)}`}
                title={reason?.support ?? reason?.text}
                className="text-ink hover:text-accent-ink text-lg tracking-tight"
              >
                #{hashtag}
                {typeof count === "number" ? (
                  <sup className="text-ink-faint ml-1 text-[10px]">
                    {formatCompactNumber(count)}
                  </sup>
                ) : null}
              </Link>
            );
          })}
        </div>
      </div>

      <div className="border-edge/70 border-t pt-7">
        <div className="flex items-center justify-between gap-4">
          <p className="text-ink-faint text-[11px] font-medium tracking-[0.16em] uppercase">
            Links circulating
          </p>
          <Link
            href={`/trending/domains?window=${window}`}
            className="text-ink-muted hover:text-ink text-xs"
          >
            Full ranking
          </Link>
        </div>
        <ol className="mt-4 space-y-3">
          {domains.slice(0, 6).map((entry, index) => {
            const domain = normalizeDomainLabel(String(entry.domain ?? ""));
            if (!domain) return null;
            const count = entry.count ?? entry.event_count;
            const reason = firstReason(mapDomainWhyNow(entry));
            return (
              <li key={`${domain}-${index}`} className="flex items-baseline gap-3">
                <span className="text-accent-ink w-6 text-xs tabular-nums">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <Link
                  href={`/domains/${encodeURIComponent(domain)}`}
                  title={reason?.support ?? reason?.text}
                  className="text-ink-dim hover:text-ink min-w-0 flex-1 truncate text-sm"
                >
                  {domain}
                </Link>
                <span className="text-ink-faint text-xs tabular-nums">
                  {typeof count === "number" ? formatCompactNumber(count) : "—"}
                </span>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}

export function EditorialOverview({
  notes,
  profiles,
  hashtags,
  domains,
  authorsByPubkey,
  pulseStats,
  sectionFailures,
  window,
}: {
  notes: EventRecord[];
  profiles: Profile[];
  hashtags: HashtagEntry[];
  domains: DomainEntry[];
  authorsByPubkey: Record<string, Profile>;
  pulseStats: PulseStat[];
  sectionFailures: { notes: boolean; profiles: boolean; hashtags: boolean; domains: boolean };
  window: StatsWindow;
}) {
  const [lead, ...followups] = notes.slice(0, 4);

  return (
    <div className="space-y-14 sm:space-y-16">
      <section
        aria-labelledby="leading-signal"
        className="grid gap-10 lg:grid-cols-[minmax(0,1.42fr)_minmax(300px,0.62fr)] lg:gap-14"
      >
        <div>
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <p className="nm-kicker">Lead signal</p>
              <h2 id="leading-signal" className="nm-display-lg text-ink mt-2">
                The note to read first
              </h2>
            </div>
            <span className="text-ink-faint text-xs">
              {window === "24h" ? "Today" : "This week"}
            </span>
          </div>
          {lead ? (
            <EditorialNote note={lead} rank={1} authorsByPubkey={authorsByPubkey} lead />
          ) : (
            <div className="border-edge/70 text-ink-muted border-y py-12 text-sm">
              {sectionFailures.notes
                ? "The note ranking is temporarily unavailable."
                : "No clear note movement in this window."}
            </div>
          )}
        </div>

        <aside aria-label="Supporting notes">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-ink-faint text-[11px] font-medium tracking-[0.16em] uppercase">
              Also moving
            </p>
            <Link
              href={`/trending/notes?window=${window}`}
              className="text-ink-muted hover:text-ink text-xs"
            >
              All notes
            </Link>
          </div>
          {followups.map((note, index) => (
            <EditorialNote
              key={noteId(note) ?? index}
              note={note}
              rank={index + 2}
              authorsByPubkey={authorsByPubkey}
            />
          ))}
        </aside>
      </section>

      <div className="grid gap-14 lg:grid-cols-[minmax(0,1.2fr)_minmax(300px,0.72fr)] lg:gap-16">
        <ProfileRanking profiles={profiles} degraded={sectionFailures.profiles} window={window} />
        <IdeasIndex
          hashtags={sectionFailures.hashtags ? [] : hashtags}
          domains={sectionFailures.domains ? [] : domains}
          window={window}
        />
      </div>

      <div className="border-edge/70 border-t pt-8">
        <NetworkPulseStrip title="Network pulse" stats={pulseStats} />
      </div>
    </div>
  );
}
