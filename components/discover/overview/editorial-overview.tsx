import Link from "next/link";

import {
  CardHitTarget,
  cardHitTargetClassName,
  DiscoveryStatPills,
} from "@/components/explorer/card-grammar";
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
  domainHeadlineCount,
  extractEngagementStats,
  formatCompactNumber,
  normalizeDomainLabel,
  noteAuthorIdentifier,
  noteInlineAuthorProfile,
  profileHref,
  profileLabel,
  profileSecondaryLabel,
  truncateIdentifier,
  truncateProfileLabel,
} from "@/components/explorer/utils";
import { NoteLinkPreviews } from "@/components/explorer/note-link-previews";
import { NoteMedia } from "@/components/explorer/note-media";
import type { NoteContentResolution } from "@/components/explorer/note-content";
import { getEditorialNoteText } from "@/components/explorer/note-preview";
import { resolveContentReferences } from "@/lib/notes/resolve-content-refs";
import { NetworkPulseStrip } from "@/components/home/network-pulse-strip";
import type { StatsWindow } from "@/lib/search-params/window";
import type {
  DiscoveryItemRanking,
  DomainEntry,
  EventRecord,
  HashtagEntry,
  Profile,
} from "@/lib/types/api";

type PulseStat = {
  label: string;
  value: string | number | boolean;
  series?: Array<{ t: number; v: number }>;
};

function firstReason(reasons: WhyNowReason[]): WhyNowReason | null {
  return reasons[0] ?? null;
}

function EvidenceLine({
  reasons,
  ranking,
}: {
  reasons: WhyNowReason[];
  ranking?: DiscoveryItemRanking;
}) {
  const reason = firstReason(reasons);
  const qualifiers = [
    typeof ranking?.source_breadth === "number" && ranking.source_breadth > 1
      ? `${ranking.source_breadth.toLocaleString()} sources`
      : null,
    ranking?.confidence ? `${ranking.confidence} confidence` : null,
  ].filter((value): value is string => Boolean(value));
  if (!reason && qualifiers.length === 0) return null;
  return (
    <p className="nm-evidence mt-3">
      <span className="text-ink-faint mr-2.5 font-semibold tracking-[0.1em] uppercase">
        Why now
      </span>
      {reason ? <span className="text-ink-soft">{reason.text}</span> : null}
      {reason?.support ? <span className="text-ink-muted"> · {reason.support}</span> : null}
      {qualifiers.length > 0 ? (
        <span className="text-ink-muted">
          {reason ? " · " : ""}
          {qualifiers.join(" · ")}
        </span>
      ) : null}
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
  contentResolution,
}: {
  note: EventRecord;
  rank: number;
  authorsByPubkey: Record<string, Profile>;
  lead?: boolean;
  contentResolution?: NoteContentResolution;
}) {
  const author = noteAuthor(note, authorsByPubkey);
  const id = noteId(note);
  const editorialText = getEditorialNoteText(note, contentResolution);
  const authorLabel = authorName(note, author);
  const authorLink = profileHref(author, typeof note.pubkey === "string" ? note.pubkey : undefined);
  const authorAvatarProfile =
    author ??
    (typeof note.pubkey === "string" && note.pubkey.length > 0 ? { pubkey: note.pubkey } : null);
  const noteHref = id ? `/notes/${encodeURIComponent(id)}` : undefined;

  return (
    <article
      className={`${
        lead
          ? "nm-elevated-surface relative overflow-hidden rounded-[var(--radius-surface)] border px-5 py-6 before:absolute before:inset-y-0 before:left-0 before:w-0.5 before:bg-[var(--ink-muted)] sm:px-7 sm:py-8"
          : "border-edge/70 border-t py-5 first:border-t-0"
      } ${noteHref ? cardHitTargetClassName : ""}`}
    >
      <span
        className={
          lead
            ? "text-ink-soft block text-[3.25rem] leading-none font-medium tracking-[-0.09em]"
            : "text-ink-muted block text-xl leading-none font-medium tracking-[-0.05em]"
        }
        aria-label={`Rank ${rank}`}
      >
        {String(rank).padStart(2, "0")}
      </span>

      <div className={lead ? "mt-5" : "mt-3"}>
        <div className="flex items-center gap-3">
          {authorAvatarProfile ? (
            <ProfileAvatar
              profile={authorAvatarProfile}
              size={lead ? 44 : 36}
              alt={authorLabel}
              href={authorLink}
              className={`${lead ? "h-11 w-11" : "h-9 w-9"} border-edge rounded-full border object-cover`}
            />
          ) : null}
          <div className="min-w-0">
            {authorLink ? (
              <Link
                href={authorLink}
                title={authorLabel}
                className="text-ink block min-h-6 min-w-0 truncate py-0.5 text-sm leading-5 font-medium hover:underline"
              >
                {truncateProfileLabel(authorLabel)}
              </Link>
            ) : (
              <p className="text-ink truncate text-sm font-medium" title={authorLabel}>
                {truncateProfileLabel(authorLabel)}
              </p>
            )}
            <Timestamp unixSeconds={note.created_at} className="nm-meta" />
          </div>
        </div>

        {editorialText ? (
          <p
            className={
              lead
                ? "text-ink-strong mt-5 line-clamp-8 max-w-[44rem] text-[clamp(1.35rem,1rem+1.15vw,2rem)] leading-[1.38] tracking-[-0.028em] [overflow-wrap:anywhere] whitespace-pre-wrap"
                : "text-ink-dim mt-3 line-clamp-3 text-[15px] leading-6 [overflow-wrap:anywhere] whitespace-pre-wrap"
            }
          >
            {editorialText}
          </p>
        ) : null}
        {typeof note.content === "string" && note.content.length > 0 ? (
          lead ? (
            <>
              <NoteMedia content={note.content} variant="lead" priority />
              <NoteLinkPreviews content={note.content} limit={1} />
            </>
          ) : (
            <NoteMedia content={note.content} variant="compact" />
          )
        ) : null}
        <EvidenceLine reasons={mapNoteWhyNow(note)} ranking={note.ranking} />
        <DiscoveryStatPills stats={extractEngagementStats(note)} className="mt-2.5" />
        {lead && noteHref ? (
          <Link
            href={noteHref}
            className="nm-action-link mt-5 min-h-11 text-sm text-[var(--ink)] [text-decoration-color:var(--accent-soft)]"
          >
            Read the leading note
          </Link>
        ) : null}
      </div>
      {noteHref ? <CardHitTarget href={noteHref} label={`Open note by ${authorLabel}`} /> : null}
    </article>
  );
}

function ProfileRanking({
  profiles,
  degraded,
  window,
  headingId = "profiles-in-motion",
  kicker = "People",
  title = "Profiles in motion",
  fullRankingHref,
  emptyMessage = "No clear profile movement.",
  degradedMessage = "Profile movement is temporarily unavailable.",
}: {
  profiles: Profile[];
  degraded?: boolean;
  window: StatsWindow;
  headingId?: string;
  kicker?: string;
  title?: string;
  fullRankingHref?: string;
  emptyMessage?: string;
  degradedMessage?: string;
}) {
  return (
    <section aria-labelledby={headingId}>
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="nm-kicker">{kicker}</p>
          <h2 id={headingId} className="nm-title text-ink mt-2">
            {title}
          </h2>
        </div>
        <Link
          href={fullRankingHref ?? `/trending/profiles?window=${window}`}
          className="nm-action-link shrink-0"
        >
          Full ranking
        </Link>
      </div>
      {profiles.length > 0 ? (
        <ol className="border-edge/70 mt-6 divide-y divide-[var(--edge)] border-y">
          {profiles.slice(0, 4).map((profile, index) => {
            const href = profileHref(profile);
            const label = profileLabel(profile);
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
                  href={href}
                  className="border-edge h-11 w-11 rounded-full border object-cover"
                />
                <div className="min-w-0">
                  {href ? (
                    <Link
                      href={href}
                      title={label}
                      className="text-ink block min-w-0 truncate font-medium hover:underline"
                    >
                      {truncateProfileLabel(label)}
                    </Link>
                  ) : (
                    <p className="text-ink truncate font-medium" title={label}>
                      {truncateProfileLabel(label)}
                    </p>
                  )}
                  {secondary && href ? (
                    <Link
                      href={href}
                      className="nm-meta hover:text-ink mt-0.5 block min-h-6 truncate py-0.5 text-[13px]"
                    >
                      {truncateIdentifier(secondary, "npub", "secondary")}
                    </Link>
                  ) : secondary ? (
                    <p className="nm-meta mt-0.5 truncate">
                      {truncateIdentifier(secondary, "npub", "secondary")}
                    </p>
                  ) : null}
                  <EvidenceLine reasons={mapProfileWhyNow(profile)} ranking={profile.ranking} />
                </div>
              </li>
            );
          })}
        </ol>
      ) : (
        <div className="border-edge/70 text-ink-muted mt-6 border-y py-8 text-sm">
          {degraded ? degradedMessage : emptyMessage}
        </div>
      )}
    </section>
  );
}

function TopicsIndex({
  hashtags,
  window,
  headingId = "ideas-gaining-ground",
}: {
  hashtags: HashtagEntry[];
  window: StatsWindow;
  headingId?: string;
}) {
  return (
    <section aria-labelledby={headingId}>
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="nm-kicker">Ideas</p>
          <h2 id={headingId} className="nm-title text-ink mt-2">
            Gaining ground
          </h2>
        </div>
        <Link href={`/trending/hashtags?window=${window}`} className="nm-action-link shrink-0">
          Full ranking
        </Link>
      </div>
      {hashtags.length > 0 ? (
        <div className="border-edge/70 mt-6 flex flex-wrap gap-x-5 gap-y-3 border-t pt-6">
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
                  <sup className="text-ink-muted ml-1 text-xs">{formatCompactNumber(count)}</sup>
                ) : null}
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="border-edge/70 text-ink-muted mt-6 border-y py-8 text-sm">
          No topics gaining ground in this window.
        </div>
      )}
    </section>
  );
}

function LinksIndex({
  domains,
  window,
  headingId = "links-circulating",
}: {
  domains: DomainEntry[];
  window: StatsWindow;
  headingId?: string;
}) {
  const visibleDomains = domains
    .slice(0, 6)
    .map((entry) => ({
      domain: normalizeDomainLabel(String(entry.domain ?? "")),
      count: domainHeadlineCount(entry),
      authors:
        typeof entry.unique_authors === "number" && entry.unique_authors > 1
          ? formatCompactNumber(entry.unique_authors)
          : null,
      reason: firstReason(mapDomainWhyNow(entry)),
    }))
    .filter((entry) => entry.domain.length > 0);
  // Only render the count column when the payload actually carries counts;
  // a column of dashes reads as broken data.
  const showDomainCounts = visibleDomains.some((entry) => typeof entry.count === "number");
  return (
    <section aria-labelledby={headingId}>
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="nm-kicker">Links</p>
          <h2 id={headingId} className="nm-title text-ink mt-2">
            Links circulating
          </h2>
        </div>
        <Link href={`/trending/domains?window=${window}`} className="nm-action-link shrink-0">
          Full ranking
        </Link>
      </div>
      {visibleDomains.length > 0 ? (
        <ol className="border-edge/70 mt-6 space-y-2 border-t pt-5">
          {visibleDomains.map(({ domain, count, authors, reason }, index) => (
            <li key={`${domain}-${index}`} className="flex items-baseline gap-3">
              <span className="text-accent-ink w-7 text-[13px] tabular-nums">
                {String(index + 1).padStart(2, "0")}
              </span>
              <Link
                href={`/domains/${encodeURIComponent(domain)}`}
                title={
                  [reason?.support ?? reason?.text, authors ? `${authors} authors` : null]
                    .filter(Boolean)
                    .join(" · ") || undefined
                }
                className="text-ink-dim hover:text-ink min-w-0 flex-1 truncate py-0.5 text-sm leading-5"
              >
                {domain}
              </Link>
              {showDomainCounts ? (
                <span className="nm-meta tabular-nums">
                  {typeof count === "number" ? (
                    <>
                      <span className="text-ink-soft">{formatCompactNumber(count)}</span> links
                    </>
                  ) : (
                    ""
                  )}
                </span>
              ) : null}
            </li>
          ))}
        </ol>
      ) : (
        <div className="border-edge/70 text-ink-muted mt-6 border-y py-8 text-sm">
          No links circulating in this window.
        </div>
      )}
    </section>
  );
}

function LeadSection({
  lead,
  authorsByPubkey,
  sectionFailed,
  window,
  headingId,
  contentResolution,
}: {
  lead?: EventRecord;
  authorsByPubkey: Record<string, Profile>;
  sectionFailed: boolean;
  window: StatsWindow;
  headingId: string;
  contentResolution?: NoteContentResolution;
}) {
  return (
    // Sticky so the lead stays in view if the supporting column runs longer;
    // `items-start` on the parent grid is required for this to take effect.
    <section aria-labelledby={headingId} className="lg:sticky lg:top-20 lg:self-start">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <p className="nm-kicker">Lead signal</p>
          <h2 id={headingId} className="nm-display-lg text-ink mt-2">
            The note to read first
          </h2>
        </div>
        <span className="nm-meta">{window === "24h" ? "Today" : "This week"}</span>
      </div>
      {lead ? (
        <EditorialNote
          note={lead}
          rank={1}
          authorsByPubkey={authorsByPubkey}
          lead
          contentResolution={contentResolution}
        />
      ) : (
        <div className="border-edge/70 text-ink-muted border-y py-12 text-sm">
          {sectionFailed
            ? "The note ranking is temporarily unavailable."
            : "No clear note movement in this window."}
        </div>
      )}
    </section>
  );
}

function SupportingNotes({
  notes,
  authorsByPubkey,
  window,
  headingId,
  contentResolution,
}: {
  notes: EventRecord[];
  authorsByPubkey: Record<string, Profile>;
  window: StatsWindow;
  headingId: string;
  contentResolution?: NoteContentResolution;
}) {
  return (
    <section aria-labelledby={headingId}>
      <div className="mb-2 flex items-center justify-between">
        <h2 id={headingId} className="nm-kicker">
          Also moving
        </h2>
        <Link href={`/trending/notes?window=${window}`} className="nm-action-link shrink-0">
          All notes
        </Link>
      </div>
      {notes.map((note, index) => (
        <EditorialNote
          key={noteId(note) ?? index}
          note={note}
          rank={index + 2}
          authorsByPubkey={authorsByPubkey}
          contentResolution={contentResolution}
        />
      ))}
    </section>
  );
}

export async function EditorialOverview({
  notes,
  profiles,
  risingProfiles,
  hashtags,
  domains,
  authorsByPubkey,
  pulseStats,
  sectionFailures,
  window,
}: {
  notes: EventRecord[];
  profiles: Profile[];
  risingProfiles: Profile[];
  hashtags: HashtagEntry[];
  domains: DomainEntry[];
  authorsByPubkey: Record<string, Profile>;
  pulseStats: PulseStat[];
  sectionFailures: {
    notes: boolean;
    profiles: boolean;
    risingProfiles: boolean;
    hashtags: boolean;
    domains: boolean;
  };
  window: StatsWindow;
}) {
  const [lead, ...followups] = notes.slice(0, 4);
  const visibleHashtags = sectionFailures.hashtags ? [] : hashtags;
  const visibleDomains = sectionFailures.domains ? [] : domains;
  const contentResolution = await resolveContentReferences(notes.slice(0, 4)).catch(
    () => undefined
  );
  if (contentResolution) {
    contentResolution.profilesByPubkey = {
      ...contentResolution.profilesByPubkey,
      ...authorsByPubkey,
    };
  }

  return (
    <div className="space-y-[var(--space-section)]">
      <section
        aria-label="Leading notes"
        className="grid items-start gap-10 lg:grid-cols-[minmax(0,1.42fr)_minmax(300px,0.62fr)] lg:gap-14 xl:gap-20"
      >
        <LeadSection
          lead={lead}
          authorsByPubkey={authorsByPubkey}
          sectionFailed={sectionFailures.notes}
          window={window}
          headingId="leading-signal"
          contentResolution={contentResolution}
        />
        <SupportingNotes
          notes={followups}
          authorsByPubkey={authorsByPubkey}
          window={window}
          headingId="supporting-notes"
          contentResolution={contentResolution}
        />
      </section>

      <div className="grid items-start gap-14 lg:grid-cols-2 lg:gap-16 xl:gap-20">
        <ProfileRanking
          profiles={profiles}
          degraded={sectionFailures.profiles}
          window={window}
          headingId="profiles-in-motion"
        />
        <ProfileRanking
          profiles={risingProfiles}
          degraded={sectionFailures.risingProfiles}
          window={window}
          headingId="up-and-coming"
          title="Up and coming"
          fullRankingHref={`/discovery/profiles/rising?window=${window}`}
          emptyMessage="No small accounts gaining ground yet."
          degradedMessage="Up-and-coming profiles are temporarily unavailable."
        />
      </div>

      <div className="grid items-start gap-14 lg:grid-cols-2 lg:gap-16 xl:gap-20">
        <TopicsIndex hashtags={visibleHashtags} window={window} headingId="ideas-gaining-ground" />
        <LinksIndex domains={visibleDomains} window={window} headingId="links-circulating" />
      </div>

      <NetworkPulseStrip title="Network pulse" stats={pulseStats} />
    </div>
  );
}
