import Link from "next/link";
import type { ReactNode } from "react";

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
  statsCitedByReasons,
  type WhyNowReason,
} from "@/components/explorer/why-now";
import { selectSupportingNotes } from "@/lib/discover/lead-notes";
import { buildDiscoverHref, LANGUAGE_EMPTY_MESSAGE } from "@/lib/search-params/language";
import { SourceFigure } from "@/components/explorer/source-figure";
import {
  extractEngagementStats,
  formatCompactNumber,
  formatProfileSecondary,
  normalizeDomainLabel,
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
import type { NoteContentResolution } from "@/components/explorer/note-content";
import { getEditorialNoteText } from "@/components/explorer/note-preview";
import { isHiddenNoteKind } from "@/lib/api/normalize";
import { GENERIC_REPOST_KIND, isLiveActivityKind, isMediaKind } from "@/lib/notes/kinds";
import {
  belowVolumeFloor,
  listedVolume,
  rankMovement,
  reasonsBesideSourceFigure,
} from "@/lib/discover/reasons";
import { resolveContentReferences } from "@/lib/notes/resolve-content-refs";
import { collapsePreviewWhitespace } from "@/lib/notes/summary-text";
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
}: {
  kicker: string;
  title: string;
  headingId: string;
  action?: { href: string; label: string };
  display?: boolean;
  aside?: ReactNode;
}) {
  return (
    <div className="flex items-end justify-between gap-4">
      <div className="min-w-0">
        <p className="nm-kicker">{kicker}</p>
        <h2 id={headingId} className={`${display ? "nm-display-lg" : "nm-title"} text-ink mt-2`}>
          {title}
        </h2>
      </div>
      {action ? (
        <Link href={action.href} className="nm-action-link mb-0.5 shrink-0">
          {action.label}
        </Link>
      ) : (
        aside
      )}
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
        omitZeroStats
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
      <article
        className={`nm-elevated-surface relative overflow-hidden rounded-[var(--radius-surface)] border px-5 py-6 before:absolute before:inset-y-0 before:left-0 before:w-0.5 before:bg-[var(--ink-muted)] sm:px-7 sm:py-7 ${
          noteHref ? cardHitTargetClassName : ""
        }`}
      >
        {authorRow}
        {editorialText ? (
          <p className="text-ink-strong mt-5 line-clamp-8 max-w-[44rem] text-[clamp(1.35rem,1rem+1.15vw,2rem)] leading-[1.38] tracking-[-0.028em] [overflow-wrap:anywhere] whitespace-pre-wrap">
            {editorialText}
          </p>
        ) : null}
        {hasContent ? (
          <>
            <NoteMedia content={note.content as string} variant="lead" priority />
            <NoteLinkPreviews content={note.content as string} limit={1} />
          </>
        ) : null}
        <EvidenceLine reasons={mapNoteWhyNow(note)} ranking={note.ranking} />
        <DiscoveryStatPills
          stats={extractEngagementStats(note)}
          omitLabels={statsCitedByReasons(mapNoteWhyNow(note))}
          className="mt-2.5"
        />
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
          <p className="text-ink-dim mt-3 line-clamp-3 text-[15px] leading-6 [overflow-wrap:anywhere]">
            {collapsePreviewWhitespace(editorialText)}
          </p>
        ) : null}
      </div>
      {hasContent ? (
        <div className="w-[5.5rem] self-end">
          <NoteMedia content={note.content as string} variant="compact" />
        </div>
      ) : null}
      <div className="col-span-2">
        <EvidenceLine reasons={mapNoteWhyNow(note)} ranking={note.ranking} />
        <DiscoveryStatPills
          stats={extractEngagementStats(note)}
          omitLabels={statsCitedByReasons(mapNoteWhyNow(note))}
          className="mt-2.5"
        />
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
  lang?: string;
  headingId?: string;
  kicker?: string;
  title?: string;
  fullRankingHref?: string;
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
          href: fullRankingHref ?? buildDiscoverHref("/trending/profiles", { window, lang }),
          label: "People index",
        }}
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

type IndexRow = {
  key: string;
  href: string;
  label: string;
  reasons: WhyNowReason[];
  ranking?: DiscoveryItemRanking;
  extra?: Array<string | null>;
  figureNoun?: string;
};

/**
 * Ranked index shared by Topics and Links. Server order follows source
 * breadth, so the right-hand figure is that count. The why-now line is
 * omitted: it would only repeat the figure or cite volume, which is not
 * the order.
 */
function RankedIndex({ rows }: { rows: IndexRow[] }) {
  return (
    <ol className="border-edge/70 mt-6 divide-y divide-[var(--edge)] border-y">
      {rows.map((row, index) => (
        <li key={row.key} className="grid grid-cols-[2.5rem_minmax(0,1fr)] gap-3 py-4">
          <span className="text-accent-ink pt-0.5 text-lg tabular-nums">
            {String(index + 1).padStart(2, "0")}
          </span>
          <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex min-w-0 items-center">
                <Link
                  href={row.href}
                  className="text-ink block min-h-6 min-w-0 truncate py-0.5 font-medium hover:underline"
                >
                  {row.label}
                </Link>
                <RankMovement ranking={row.ranking} />
              </div>
              <SourceFigure ranking={row.ranking} noun={row.figureNoun} className="ml-auto" />
            </div>
            <EvidenceLine
              reasons={reasonsBesideSourceFigure(row.ranking, row.reasons)}
              ranking={row.ranking}
              extra={row.extra}
              className="mt-1"
            />
          </div>
        </li>
      ))}
    </ol>
  );
}

/**
 * "N authors" qualifier for index rows. Skipped when the server already cites
 * breadth (as the leading reason or as `source_breadth`), so the line never
 * reads "160 authors · 160 sources".
 */
function authorsQualifier(
  count: unknown,
  reasons: WhyNowReason[],
  ranking?: DiscoveryItemRanking
): string | null {
  if (typeof ranking?.source_breadth === "number") return null;
  if (/authors?\b/.test(reasons[0]?.text ?? "")) return null;
  return typeof count === "number" && Number.isFinite(count) && count > 1
    ? `${formatCompactNumber(count)} authors`
    : null;
}

function TopicsIndex({
  hashtags,
  window,
  lang,
  headingId = "ideas-gaining-ground",
}: {
  hashtags: HashtagEntry[];
  window: StatsWindow;
  lang?: string;
  headingId?: string;
}) {
  const rows = hashtags
    .slice(0, INDEX_ROW_LIMIT)
    .map((entry, index): IndexRow | null => {
      const hashtag = String(entry.hashtag ?? "").replace(/^#/, "");
      if (!hashtag) return null;
      if (belowVolumeFloor(listedVolume([entry.event_count, entry.count]))) return null;
      const reasons = mapHashtagWhyNow(entry);
      return {
        key: `${hashtag}-${index}`,
        href: `/hashtags/${encodeURIComponent(hashtag)}`,
        label: `#${hashtag}`,
        reasons,
        ranking: entry.ranking,
        extra: [authorsQualifier(entry.unique_authors, reasons, entry.ranking)],
        figureNoun: "authors",
      };
    })
    .filter((row): row is IndexRow => row !== null);
  return (
    <section aria-labelledby={headingId}>
      <SectionHeader
        kicker="Ideas"
        title="Gaining ground"
        headingId={headingId}
        action={{
          href: buildDiscoverHref("/trending/hashtags", { window, lang }),
          label: "Topic index",
        }}
      />
      {rows.length > 0 ? (
        <RankedIndex rows={rows} />
      ) : (
        <EmptyRow>{scopedEmpty(lang, "No topics gaining ground in this window.")}</EmptyRow>
      )}
    </section>
  );
}

function LinksIndex({
  domains,
  window,
  lang,
  headingId = "links-circulating",
}: {
  domains: DomainEntry[];
  window: StatsWindow;
  lang?: string;
  headingId?: string;
}) {
  const rows = domains
    .slice(0, INDEX_ROW_LIMIT)
    .map((entry, index): IndexRow | null => {
      const domain = normalizeDomainLabel(String(entry.domain ?? ""));
      if (!domain) return null;
      if (
        belowVolumeFloor(
          listedVolume([entry.link_count, entry.count, entry.event_count, entry.note_count])
        )
      )
        return null;
      const reasons = mapDomainWhyNow(entry);
      return {
        key: `${domain}-${index}`,
        href: `/domains/${encodeURIComponent(domain)}`,
        label: domain,
        reasons,
        ranking: entry.ranking,
        extra: [authorsQualifier(entry.unique_authors, reasons, entry.ranking)],
      };
    })
    .filter((row): row is IndexRow => row !== null);
  return (
    <section aria-labelledby={headingId}>
      <SectionHeader
        kicker="Links"
        title="Links circulating"
        headingId={headingId}
        action={{
          href: buildDiscoverHref("/trending/domains", { window, lang }),
          label: "Link index",
        }}
      />
      {rows.length > 0 ? (
        <RankedIndex rows={rows} />
      ) : (
        <EmptyRow>{scopedEmpty(lang, "No links circulating in this window.")}</EmptyRow>
      )}
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
}: {
  lead?: EventRecord;
  authorsByPubkey: Record<string, Profile>;
  sectionFailed: boolean;
  lang?: string;
  headingId: string;
  contentResolution?: NoteContentResolution;
}) {
  return (
    // Sticky so the lead stays in view if the supporting column runs longer;
    // `items-start` on the parent grid is required for this to take effect.
    <section aria-labelledby={headingId} className="lg:sticky lg:top-20 lg:self-start">
      <div className="mb-6">
        <SectionHeader
          kicker="Lead signal"
          title="The note to read first"
          headingId={headingId}
          display
        />
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
    </section>
  );
}

function SupportingNotes({
  notes,
  authorsByPubkey,
  window,
  lang,
  headingId,
  contentResolution,
}: {
  notes: EventRecord[];
  authorsByPubkey: Record<string, Profile>;
  window: StatsWindow;
  lang?: string;
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
            href: buildDiscoverHref("/trending/notes", { window, lang }),
            label: "All notes",
          }}
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
  lang,
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
  lang?: string;
}) {
  const lead = notes[0];
  const followups = selectSupportingNotes(notes);
  const visibleHashtags = sectionFailures.hashtags ? [] : hashtags;
  const visibleDomains = sectionFailures.domains ? [] : domains;
  const contentResolution = await resolveContentReferences(lead ? [lead, ...followups] : []).catch(
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
          lang={lang}
          headingId="leading-signal"
          contentResolution={contentResolution}
        />
        <SupportingNotes
          notes={followups}
          authorsByPubkey={authorsByPubkey}
          window={window}
          lang={lang}
          headingId="supporting-notes"
          contentResolution={contentResolution}
        />
      </section>

      <div className="grid items-start gap-14 lg:grid-cols-2 lg:gap-16 xl:gap-20">
        <ProfileRanking
          profiles={profiles}
          degraded={sectionFailures.profiles}
          window={window}
          lang={lang}
          headingId="profiles-in-motion"
        />
        <ProfileRanking
          profiles={risingProfiles}
          degraded={sectionFailures.risingProfiles}
          window={window}
          lang={lang}
          headingId="up-and-coming"
          title="Up and coming"
          fullRankingHref={buildDiscoverHref("/discovery/profiles/rising", { window, lang })}
          emptyMessage="No small accounts gaining ground yet."
          degradedMessage="Up-and-coming profiles are temporarily unavailable."
        />
      </div>

      <div className="grid items-start gap-14 lg:grid-cols-2 lg:gap-16 xl:gap-20">
        <TopicsIndex
          hashtags={visibleHashtags}
          window={window}
          lang={lang}
          headingId="ideas-gaining-ground"
        />
        <LinksIndex
          domains={visibleDomains}
          window={window}
          lang={lang}
          headingId="links-circulating"
        />
      </div>

      <NetworkPulseStrip title="Network pulse" stats={pulseStats} />
    </div>
  );
}
