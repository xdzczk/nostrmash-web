import Link from "@/components/app-link";
import type { ReactNode } from "react";

import { CardHitTarget, cardHitTargetClassName } from "@/components/explorer/card-grammar";
import { PostEngagement } from "@/components/explorer/post-engagement";
import { TopZap } from "@/components/explorer/top-zap";
import { ProfileAvatar } from "@/components/explorer/profile-avatar";
import { Timestamp } from "@/components/explorer/timestamp";
import { mapNoteWhyNow, mapProfileWhyNow, type WhyNowReason } from "@/components/explorer/why-now";
import { Orientation } from "@/components/discover/orientation";
import { type Briefing } from "@/lib/discover/briefing";
import { unusualDomains, unusualHashtags } from "@/lib/discover/unusual";
import { INTERESTS } from "@/lib/discover/interests";
import { sharedTopicLine } from "@/lib/discover/stories";
import { selectSupportingNotes } from "@/lib/discover/lead-notes";
import { MEDIA_RANKINGS, type MediaLeaders } from "@/lib/discover/media-rankings";
import { buildDiscoverHref, LANGUAGE_EMPTY_MESSAGE } from "@/lib/search-params/language";
import { SourceFigure } from "@/components/explorer/source-figure";
import {
  postEngagementStats,
  formatProfileSecondary,
  noteAuthorIdentifier,
  noteInlineAuthorProfile,
  profileHref,
  profileLabel,
  profileSecondaryLabel,
  truncateProfileLabel,
} from "@/components/explorer/utils";
import { EventKindSwitch } from "@/components/explorer/event-kind-switch";
import { isLongFormEvent } from "@/components/explorer/article-meta";
import { NoteLinkPreviews } from "@/components/explorer/note-link-previews";
import { NoteMedia } from "@/components/explorer/note-media";
import {
  MentionedNoteCards,
  NoteBody,
  type NoteContentResolution,
} from "@/components/explorer/note-content";
import { fetchProfilesByPubkey } from "@/lib/api/profile-hydration";
import { getEditorialNoteText } from "@/components/explorer/note-preview";
import { isHiddenNoteKind } from "@/lib/api/normalize";
import { GENERIC_REPOST_KIND, isLiveActivityKind, isMediaKind } from "@/lib/notes/kinds";
import { rankMovement } from "@/lib/discover/reasons";
import { resolveContentReferences } from "@/lib/notes/resolve-content-refs";
import { NetworkPulseStrip } from "@/components/home/network-pulse-strip";
import type { StatsWindow } from "@/lib/search-params/window";
import type { CoverageNote } from "@/lib/stats/coverage-notes";
import type {
  DiscoveryItemRanking,
  DomainEntry,
  EventRecord,
  HashtagEntry,
  Profile,
} from "@/lib/types/api";
import type { DomainMomentum, HashtagMomentum } from "@/lib/types/surfaces";

type PulseStat = {
  label: string;
  value: string | number | boolean;
  series?: Array<{ t: number; v: number }>;
  baseline?: {
    metric?: string;
    window?: string;
    value?: number;
    typical?: number;
    typical_basis?: string;
  } | null;
};

const INDEX_ROW_LIMIT = 6;
const PROFILE_ROW_LIMIT = 4;

function firstReason(reasons: WhyNowReason[]): WhyNowReason | null {
  return reasons[0] ?? null;
}

/**
 * One header grammar for every section: kicker, title, and an optional
 * action link sat on the title's bottom edge.
 */
function SectionHeader({
  kicker,
  title,
  headingId,
  action,
  display = false,
  aside,
  ranked,
}: {
  kicker: string;
  title: string;
  headingId: string;
  action?: { href: string; label: string };
  display?: boolean;
  aside?: ReactNode;
  /** Methodology anchor for this ranking. */
  ranked?: string;
}) {
  return (
    <div className="flex items-end justify-between gap-4">
      <div className="min-w-0">
        <p className="nm-kicker">{kicker}</p>
        <h2 id={headingId} className={`${display ? "nm-display-lg" : "nm-title"} text-ink mt-2`}>
          {title}
        </h2>
      </div>
      {action || ranked || aside ? (
        <div className="mb-0.5 flex shrink-0 flex-col items-end gap-1">
          {action ? (
            <Link href={action.href} className="nm-action-link">
              {action.label}
            </Link>
          ) : (
            aside
          )}
          {ranked ? (
            <Link href={ranked} className="text-ink-faint hover:text-ink text-xs">
              How this is ranked
            </Link>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function EmptyRow({ children }: { children: ReactNode }) {
  return <div className="border-edge/70 text-ink-muted mt-6 border-y py-8 text-sm">{children}</div>;
}

/** Rank movement since the previous computation; silent when unchanged or unknown. */
function RankMovement({ ranking }: { ranking?: DiscoveryItemRanking }) {
  const movement = rankMovement(ranking);
  if (!movement) return null;
  const up = movement.direction === "up";
  return (
    <span
      className={`ml-2 inline-flex items-center gap-0.5 align-middle text-xs font-medium tabular-nums ${
        up ? "text-accent-ink" : "text-ink-faint"
      }`}
      aria-label={`${up ? "Up" : "Down"} ${movement.places} ${movement.places === 1 ? "place" : "places"}`}
    >
      <span aria-hidden>{up ? "↑" : "↓"}</span>
      {movement.places}
    </span>
  );
}

function EvidenceLine({
  reasons,
  ranking,
  extra = [],
  className = "mt-3",
}: {
  reasons: WhyNowReason[];
  ranking?: DiscoveryItemRanking;
  /** Additional qualifiers (e.g. author breadth) appended after the reason. */
  extra?: Array<string | null | undefined>;
  className?: string;
}) {
  const reason = firstReason(reasons);
  const qualifiers = extra.filter((value): value is string => Boolean(value));
  if (!reason && qualifiers.length === 0) return null;
  return (
    <p
      className={`nm-evidence ${className}`}
      title={ranking?.confidence ? `${ranking.confidence} confidence` : undefined}
    >
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
  if (isHiddenNoteKind(note)) return null;
  const author = noteAuthor(note, authorsByPubkey);
  if (
    isMediaKind(note.kind) ||
    isLiveActivityKind(note.kind) ||
    note.kind === 6 ||
    note.kind === GENERIC_REPOST_KIND ||
    isLongFormEvent(note)
  ) {
    return (
      <EventKindSwitch
        event={note}
        author={author}
        surface="list"
        rank={rank}
        contentResolution={contentResolution}
        profilesByPubkey={authorsByPubkey}
        showUtilityLinks={false}
      />
    );
  }
  const id = noteId(note);
  const editorialText = getEditorialNoteText(note, contentResolution);
  const authorLabel = authorName(note, author);
  const authorLink = profileHref(author, typeof note.pubkey === "string" ? note.pubkey : undefined);
  const authorAvatarProfile =
    author ??
    (typeof note.pubkey === "string" && note.pubkey.length > 0 ? { pubkey: note.pubkey } : null);
  const noteHref = id ? `/notes/${encodeURIComponent(id)}` : undefined;
  const hasContent = typeof note.content === "string" && note.content.length > 0;

  const authorRow = (
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
  );

  if (lead) {
    return (
      <article className={`border-edge/70 border-t pt-5 ${noteHref ? cardHitTargetClassName : ""}`}>
        {authorRow}
        {editorialText ? (
          <NoteBody
            content={editorialText}
            tags={note.tags}
            resolution={contentResolution}
            className="text-ink-strong mt-5 line-clamp-8 max-w-[44rem] text-[clamp(1.35rem,1rem+1.15vw,2rem)] leading-[1.38] tracking-[-0.028em] [overflow-wrap:anywhere]"
            size="lead"
          />
        ) : null}
        {hasContent ? (
          <>
            <NoteMedia content={note.content as string} variant="lead" priority />
            <NoteLinkPreviews content={note.content as string} limit={1} />
          </>
        ) : null}
        {hasContent ? (
          <MentionedNoteCards
            content={note.content as string}
            tags={note.tags}
            resolution={contentResolution}
            className="mt-5 max-w-[44rem]"
          />
        ) : null}
        <EvidenceLine reasons={mapNoteWhyNow(note)} ranking={note.ranking} />
        <PostEngagement stats={postEngagementStats(note)} className="mt-2.5" />
        <TopZap source={note} />
        {noteHref ? (
          <Link
            href={noteHref}
            className="nm-action-link mt-5 min-h-11 text-sm text-[var(--ink)] [text-decoration-color:var(--accent-soft)]"
          >
            Read the leading note
          </Link>
        ) : null}
        {noteHref ? <CardHitTarget href={noteHref} label={`Open note by ${authorLabel}`} /> : null}
      </article>
    );
  }

  // Compact at every width: a square thumbnail beside the text, so a
  // screenshot cannot outrank the lead note in the other column.
  return (
    <article
      className={`border-edge/70 grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 border-t py-5 first:border-t-0 ${
        noteHref ? cardHitTargetClassName : ""
      }`}
    >
      <div className="min-w-0">
        <span
          className="text-ink-muted block text-xl leading-none font-medium tracking-[-0.05em]"
          aria-label={`Rank ${rank}`}
        >
          {String(rank).padStart(2, "0")}
        </span>
        <div className="mt-3">{authorRow}</div>
        {editorialText ? (
          <NoteBody
            content={editorialText}
            tags={note.tags}
            resolution={contentResolution}
            className="text-ink-dim mt-3 line-clamp-3 text-[15px] leading-6 [overflow-wrap:anywhere]"
          />
        ) : null}
        {hasContent ? (
          <MentionedNoteCards
            content={note.content as string}
            tags={note.tags}
            resolution={contentResolution}
            className="mt-3"
          />
        ) : null}
      </div>
      {hasContent ? (
        <div className="w-[5.5rem] self-end">
          <NoteMedia content={note.content as string} variant="compact" />
        </div>
      ) : null}
      <div className="col-span-2">
        <EvidenceLine reasons={mapNoteWhyNow(note)} ranking={note.ranking} />
        <PostEngagement stats={postEngagementStats(note)} className="mt-2.5" />
        <TopZap source={note} />
      </div>
      {noteHref ? <CardHitTarget href={noteHref} label={`Open note by ${authorLabel}`} /> : null}
    </article>
  );
}

function scopedEmpty(lang: string | undefined, fallback: string): string {
  return lang ? LANGUAGE_EMPTY_MESSAGE : fallback;
}

function ProfileRanking({
  profiles,
  degraded,
  window,
  lang,
  excludeBridged,
  headingId = "profiles-in-motion",
  kicker = "People",
  title = "People gaining attention",
  fullRankingHref,
  rankedHref = "/methodology#people",
  emptyMessage = "No clear profile movement.",
  degradedMessage = "Profile movement is temporarily unavailable.",
}: {
  profiles: Profile[];
  degraded?: boolean;
  window: StatsWindow;
  lang?: string;
  excludeBridged?: boolean;
  headingId?: string;
  kicker?: string;
  title?: string;
  fullRankingHref?: string;
  rankedHref?: string;
  emptyMessage?: string;
  degradedMessage?: string;
}) {
  return (
    <section aria-labelledby={headingId}>
      <SectionHeader
        kicker={kicker}
        title={title}
        headingId={headingId}
        action={{
          href:
            fullRankingHref ??
            buildDiscoverHref("/trending/profiles", { window, lang, excludeBridged }),
          label: "People index",
        }}
        ranked={rankedHref}
      />
      {profiles.length > 0 ? (
        <ol className="border-edge/70 mt-6 divide-y divide-[var(--edge)] border-y">
          {profiles.slice(0, PROFILE_ROW_LIMIT).map((profile, index) => {
            const href = profileHref(profile);
            const label = profileLabel(profile);
            const secondary = profileSecondaryLabel(profile);
            const secondaryText = secondary ? formatProfileSecondary(secondary) : "";
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
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex min-w-0 items-center">
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
                      <RankMovement ranking={profile.ranking} />
                    </div>
                    <SourceFigure ranking={profile.ranking} className="ml-auto" />
                  </div>
                  {secondaryText && href ? (
                    <Link
                      href={href}
                      title={secondary ?? undefined}
                      className="nm-meta hover:text-ink mt-0.5 block min-h-6 truncate py-0.5 text-[13px]"
                    >
                      {secondaryText}
                    </Link>
                  ) : secondaryText ? (
                    <p className="nm-meta mt-0.5 truncate" title={secondary ?? undefined}>
                      {secondaryText}
                    </p>
                  ) : null}
                  <EvidenceLine reasons={mapProfileWhyNow(profile)} ranking={profile.ranking} />
                </div>
              </li>
            );
          })}
        </ol>
      ) : (
        <EmptyRow>{degraded ? degradedMessage : scopedEmpty(lang, emptyMessage)}</EmptyRow>
      )}
    </section>
  );
}

function UnusualTopics({
  items,
  ranked,
  window,
  lang,
  excludeBridged,
}: {
  items: HashtagMomentum[];
  ranked: HashtagEntry[];
  window: StatsWindow;
  lang?: string;
  excludeBridged?: boolean;
}) {
  const rows = unusualHashtags(items, ranked).slice(0, INDEX_ROW_LIMIT);
  if (rows.length === 0) return null;
  return (
    <section aria-labelledby="unusual-today">
      <SectionHeader
        kicker="Topics"
        title="Unusual today"
        headingId="unusual-today"
        action={{
          href: buildDiscoverHref("/trending/hashtags", { window, lang, excludeBridged }),
          label: "Most used",
        }}
        ranked="/methodology#topics"
      />
      <ol className="border-edge/70 mt-6 divide-y divide-[var(--edge)] border-y">
        {rows.map((hashtag) => (
          <li key={hashtag} className="py-3">
            <Link
              href={`/hashtags/${encodeURIComponent(hashtag)}`}
              className="text-ink font-medium hover:underline"
            >
              {`#${hashtag}`}
            </Link>
            <p className="text-ink-muted mt-1 text-sm">Moving faster than its recent pace.</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

function UnusualLinks({
  items,
  ranked,
  window,
  lang,
  excludeBridged,
}: {
  items: DomainMomentum[];
  ranked: DomainEntry[];
  window: StatsWindow;
  lang?: string;
  excludeBridged?: boolean;
}) {
  const rows = unusualDomains(items, ranked).slice(0, INDEX_ROW_LIMIT);
  if (rows.length === 0) return null;
  return (
    <section aria-labelledby="links-circulating">
      <SectionHeader
        kicker="Links"
        title="Unusual today"
        headingId="links-circulating"
        action={{
          href: buildDiscoverHref("/trending/domains", { window, lang, excludeBridged }),
          label: "Most shared",
        }}
        ranked="/methodology#links"
      />
      <ol className="border-edge/70 mt-6 divide-y divide-[var(--edge)] border-y">
        {rows.map((domain) => (
          <li key={domain} className="py-3">
            <Link
              href={`/domains/${encodeURIComponent(domain)}`}
              className="text-ink font-medium hover:underline"
            >
              {domain}
            </Link>
            <p className="text-ink-muted mt-1 text-sm">Moving faster than its recent pace.</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

function LeadSection({
  lead,
  authorsByPubkey,
  sectionFailed,
  lang,
  headingId,
  contentResolution,
  storyLine,
}: {
  lead?: EventRecord;
  authorsByPubkey: Record<string, Profile>;
  sectionFailed: boolean;
  lang?: string;
  headingId: string;
  contentResolution?: NoteContentResolution;
  storyLine?: string | null;
}) {
  return (
    // Sticky so the lead stays in view if the supporting column runs longer;
    // `items-start` on the parent grid is required for this to take effect.
    <section aria-labelledby={headingId} className="lg:sticky lg:top-20 lg:self-start">
      <div className="mb-4 flex items-end justify-between gap-4">
        <h2 id={headingId} className="nm-kicker scroll-mt-24">
          The note to read first
        </h2>
        <Link href="/methodology#notes" className="text-ink-faint hover:text-ink text-xs">
          How this is ranked
        </Link>
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
            : scopedEmpty(lang, "No clear note movement in this window.")}
        </div>
      )}
      {storyLine ? (
        <p className="text-ink-soft mt-4 max-w-[46rem] text-sm leading-6">{storyLine}</p>
      ) : null}
    </section>
  );
}

function SupportingNotes({
  notes,
  authorsByPubkey,
  window,
  lang,
  excludeBridged,
  headingId,
  contentResolution,
}: {
  notes: EventRecord[];
  authorsByPubkey: Record<string, Profile>;
  window: StatsWindow;
  lang?: string;
  excludeBridged?: boolean;
  headingId: string;
  contentResolution?: NoteContentResolution;
}) {
  return (
    <section aria-labelledby={headingId}>
      <div className="mb-3">
        <SectionHeader
          kicker="Notes"
          title="Also moving"
          headingId={headingId}
          action={{
            href: buildDiscoverHref("/trending/notes", { window, lang, excludeBridged }),
            label: "All notes",
          }}
          ranked="/methodology#notes"
        />
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

function MediaLeadersSection({
  leaders,
  authorsByPubkey,
  window,
  lang,
  excludeBridged,
  contentResolution,
}: {
  leaders: MediaLeaders;
  authorsByPubkey: Record<string, Profile>;
  window: StatsWindow;
  lang?: string;
  excludeBridged?: boolean;
  contentResolution?: NoteContentResolution;
}) {
  const columns = MEDIA_RANKINGS.flatMap((ranking) => {
    const event = leaders[ranking.format];
    return event ? [{ ...ranking, event }] : [];
  });
  if (columns.length === 0) return null;

  return (
    <section aria-labelledby="media-leaders">
      <SectionHeader
        kicker="Media"
        title="Leading each format"
        headingId="media-leaders"
        ranked="/methodology#ranking-orders"
      />
      <div
        className={`mt-6 grid items-start gap-10 ${columns.length > 1 ? "lg:grid-cols-2" : ""} ${
          columns.length > 2 ? "xl:grid-cols-3" : ""
        }`}
      >
        {columns.map((column) => {
          const pubkey =
            typeof column.event.pubkey === "string" ? column.event.pubkey.toLowerCase() : "";
          return (
            <div key={column.format} className="min-w-0">
              <div className="mb-3 flex items-end justify-between gap-3">
                <h3 className="nm-kicker">{column.label}</h3>
                <Link
                  href={buildDiscoverHref(column.path, { window, lang, excludeBridged })}
                  className="nm-action-link"
                >
                  Ranking
                </Link>
              </div>
              <EventKindSwitch
                event={column.event}
                author={pubkey ? authorsByPubkey[pubkey] : undefined}
                surface="list"
                showUtilityLinks={false}
                contentResolution={contentResolution}
              />
              {postEngagementStats(column.event).every((stat) => stat.value === 0) ? (
                <p className="text-ink-muted mt-2 text-xs">
                  {mapNoteWhyNow(column.event)[0]?.text ?? "Newest in a quiet window"}
                </p>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}

export async function EditorialOverview({
  notes,
  mediaLeaders,
  profiles,
  risingProfiles,
  authorsByPubkey,
  pulseStats,
  sectionFailures,
  window,
  lang,
  excludeBridged,
  emergingHashtags = [],
  emergingDomains = [],
  rankedHashtags = [],
  rankedDomains = [],
  archiveDay = null,
  coverageNotes = [],
  briefing = null,
}: {
  notes: EventRecord[];
  mediaLeaders: MediaLeaders;
  profiles: Profile[];
  risingProfiles: Profile[];
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
  lang?: string;
  excludeBridged?: boolean;
  emergingHashtags?: HashtagMomentum[];
  emergingDomains?: DomainMomentum[];
  rankedHashtags?: HashtagEntry[];
  rankedDomains?: DomainEntry[];
  archiveDay?: string | null;
  coverageNotes?: readonly CoverageNote[];
  briefing?: Briefing | null;
}) {
  const lead = notes[0];
  const followups = selectSupportingNotes(notes);
  const mediaEvents = MEDIA_RANKINGS.flatMap((ranking) => {
    const event = mediaLeaders[ranking.format];
    return event ? [event] : [];
  });
  const previewEvents = [...(lead ? [lead, ...followups] : []), ...mediaEvents];
  const contentResolution = await resolveContentReferences(previewEvents).catch(() => undefined);
  if (contentResolution) {
    const knownProfiles = contentResolution.profilesByPubkey ?? {};
    const quotedPubkeys = Object.values(contentResolution.eventsById ?? {})
      .map((event) => (typeof event?.pubkey === "string" ? event.pubkey : ""))
      .filter((pubkey) => pubkey.length > 0 && !knownProfiles[pubkey.toLowerCase()]);
    const quotedAuthors =
      quotedPubkeys.length > 0
        ? await fetchProfilesByPubkey(quotedPubkeys, "shortTtl").catch(
            () => ({}) as Record<string, Profile>
          )
        : {};
    contentResolution.profilesByPubkey = {
      ...knownProfiles,
      ...quotedAuthors,
      ...authorsByPubkey,
    };
  }

  return (
    <div className="space-y-[var(--space-section)]">
      {briefing && briefing.items.length > 0 ? (
        <ul
          aria-label="Today in brief"
          className="text-ink-soft max-w-[46rem] space-y-1 text-sm leading-6"
        >
          {briefing.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : null}
      <section
        aria-label="Leading notes"
        className="grid items-start gap-10 lg:grid-cols-[minmax(0,1.42fr)_minmax(300px,0.62fr)] lg:gap-14 xl:gap-20"
      >
        <LeadSection
          lead={lead}
          authorsByPubkey={authorsByPubkey}
          sectionFailed={sectionFailures.notes}
          lang={lang}
          headingId="leading-signal"
          contentResolution={contentResolution}
          storyLine={sharedTopicLine(lead ? [lead, ...followups] : followups)}
        />
        <SupportingNotes
          notes={followups}
          authorsByPubkey={authorsByPubkey}
          window={window}
          lang={lang}
          excludeBridged={excludeBridged}
          headingId="supporting-notes"
          contentResolution={contentResolution}
        />
      </section>

      <nav aria-label="Browse by interest" className="flex flex-wrap gap-x-4 gap-y-2">
        {INTERESTS.map((interest) => (
          <Link
            key={interest.href}
            href={interest.href}
            className="text-ink-soft hover:text-ink text-sm"
          >
            {interest.label}
          </Link>
        ))}
      </nav>
      <Orientation />

      <MediaLeadersSection
        leaders={mediaLeaders}
        authorsByPubkey={authorsByPubkey}
        window={window}
        lang={lang}
        excludeBridged={excludeBridged}
        contentResolution={contentResolution}
      />

      <div className="grid items-start gap-14 lg:grid-cols-2 lg:gap-16 xl:gap-20">
        <ProfileRanking
          profiles={profiles}
          degraded={sectionFailures.profiles}
          window={window}
          lang={lang}
          excludeBridged={excludeBridged}
          headingId="profiles-in-motion"
        />
        <ProfileRanking
          profiles={risingProfiles}
          degraded={sectionFailures.risingProfiles}
          window={window}
          lang={lang}
          excludeBridged={excludeBridged}
          headingId="up-and-coming"
          title="Up and coming"
          rankedHref="/methodology#rising"
          fullRankingHref={buildDiscoverHref("/discovery/profiles/rising", {
            window,
            lang,
            excludeBridged,
          })}
          emptyMessage="No small accounts gaining ground yet."
          degradedMessage="Up-and-coming profiles are temporarily unavailable."
        />
      </div>

      <div className="grid items-start gap-14 lg:grid-cols-2 lg:gap-16 xl:gap-20">
        <UnusualTopics
          items={emergingHashtags}
          ranked={rankedHashtags}
          window={window}
          lang={lang}
          excludeBridged={excludeBridged}
        />
        <UnusualLinks
          items={emergingDomains}
          ranked={rankedDomains}
          window={window}
          lang={lang}
          excludeBridged={excludeBridged}
        />
      </div>

      {archiveDay ? (
        <p className="text-sm">
          <Link href={`/day/${archiveDay}`} className="nm-action-link">
            {`Overview for ${archiveDay}`}
          </Link>
        </p>
      ) : null}
      <NetworkPulseStrip title="Network pulse" stats={pulseStats} coverageNotes={coverageNotes} />
    </div>
  );
}
