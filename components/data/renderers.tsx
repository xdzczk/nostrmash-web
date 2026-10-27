import Link from "next/link";

import { ArticleCard } from "@/components/explorer/article-card";
import { DomainChip } from "@/components/explorer/domain-chip";
import { pickPrimaryDomainSupportingSignal } from "@/components/explorer/domain-supporting-signal";
import { HashtagChip } from "@/components/explorer/hashtag-chip";
import { NoteCard } from "@/components/explorer/note-card";
import type { NoteContentSize } from "@/components/explorer/note-content";
import type { NoteMediaVariant } from "@/components/explorer/note-media";
import { SourceFigure } from "@/components/explorer/source-figure";
import { mapDomainWhyNow, mapHashtagWhyNow, WhyNow } from "@/components/explorer/why-now";
import {
  domainHeadlineCount,
  normalizeDomainLabel,
  noteInlineAuthorProfile,
} from "@/components/explorer/utils";
import { ProfileCard } from "@/components/explorer/profile-card";
import { isLongFormEvent } from "@/components/explorer/article-meta";
import { belowVolumeFloor, listedVolume, reasonsBesideSourceFigure } from "@/lib/discover/reasons";
import { resolveContentReferences } from "@/lib/notes/resolve-content-refs";
import {
  type DomainEntry,
  type EventRecord,
  type HashtagEntry,
  type Profile,
} from "@/lib/types/api";

function getAuthorByPubkey(
  authorsByPubkey: Record<string, Profile> | undefined,
  note: EventRecord
): Profile | undefined {
  const inlineAuthor = noteInlineAuthorProfile(note);
  if (inlineAuthor) return inlineAuthor;
  const pubkey = note.pubkey;
  if (!authorsByPubkey || typeof pubkey !== "string") return undefined;
  const normalized = pubkey.trim().toLowerCase();
  return authorsByPubkey[normalized] ?? authorsByPubkey[pubkey];
}

export async function NotesList({
  notes,
  authorsByPubkey,
  ranked = false,
  showFullContent = false,
  discoverySignals = false,
  conversation = false,
  showAuthor = true,
  showUtilityLinks = true,
  omitZeroStats = false,
  compactMedia = false,
  mediaVariant,
  suppressEmbeds,
  highlightTerms,
  rankOffset = 0,
  contentSize,
}: {
  notes: EventRecord[];
  authorsByPubkey?: Record<string, Profile>;
  ranked?: boolean;
  showFullContent?: boolean;
  discoverySignals?: boolean;
  /** Hot conversations: reply count is the row stat, plus one thread link. */
  conversation?: boolean;
  showAuthor?: boolean;
  showUtilityLinks?: boolean;
  omitZeroStats?: boolean;
  /** Square thumbnail instead of full-bleed media. */
  compactMedia?: boolean;
  /** Overrides the list thumbnail. Profile notes use `feed`. */
  mediaVariant?: NoteMediaVariant;
  /** Hide link-unfurl cards. Defaults on for compact thumbnail lists. */
  suppressEmbeds?: boolean;
  /** Query terms marked inside note text. */
  highlightTerms?: string[];
  /**
   * Items skipped before this page. Discovery ranks restart at 1 on every
   * offset page, so the displayed place is the page rank plus this offset.
   */
  rankOffset?: number;
  /** Profile lists read at 16px. Omitted on Discover, which stays compact. */
  contentSize?: NoteContentSize;
}) {
  const contentResolution = await resolveContentReferences(notes).catch(() => undefined);
  if (contentResolution && authorsByPubkey) {
    contentResolution.profilesByPubkey = {
      ...contentResolution.profilesByPubkey,
      ...authorsByPubkey,
    };
  }

  return (
    <ul className="min-w-0">
      {notes.map((note, index) => (
        <li key={note.id ?? `note-${index}`} className="min-w-0">
          {isLongFormEvent(note) ? (
            <ArticleCard
              article={note}
              author={getAuthorByPubkey(authorsByPubkey, note)}
              rank={
                ranked
                  ? conversation
                    ? rankOffset + index + 1
                    : rankOffset + (note.ranking?.rank ?? index + 1)
                  : undefined
              }
              discoverySignals={discoverySignals}
              contentResolution={contentResolution}
              showAuthor={showAuthor}
              showUtilityLinks={showUtilityLinks}
              omitZeroStats={omitZeroStats}
            />
          ) : (
            <NoteCard
              note={note}
              author={getAuthorByPubkey(authorsByPubkey, note)}
              rank={
                ranked
                  ? conversation
                    ? rankOffset + index + 1
                    : rankOffset + (note.ranking?.rank ?? index + 1)
                  : undefined
              }
              showFullContent={showFullContent}
              discoverySignals={discoverySignals}
              contentResolution={contentResolution}
              conversation={conversation}
              showAuthor={showAuthor}
              showUtilityLinks={showUtilityLinks}
              omitZeroStats={omitZeroStats}
              mediaVariant={mediaVariant ?? (compactMedia ? "compact" : undefined)}
              suppressEmbeds={suppressEmbeds ?? compactMedia}
              highlightTerms={highlightTerms}
              contentSize={contentSize}
            />
          )}
        </li>
      ))}
    </ul>
  );
}

export async function ArticlesList({
  articles,
  authorsByPubkey,
  ranked = false,
  discoverySignals = false,
  showAuthor = true,
  showUtilityLinks = true,
  omitZeroStats = false,
  rankOffset = 0,
}: {
  articles: EventRecord[];
  authorsByPubkey?: Record<string, Profile>;
  ranked?: boolean;
  discoverySignals?: boolean;
  showAuthor?: boolean;
  showUtilityLinks?: boolean;
  omitZeroStats?: boolean;
  /** Items skipped before this page. See `NotesList`. */
  rankOffset?: number;
}) {
  const contentResolution = await resolveContentReferences(articles).catch(() => undefined);
  if (contentResolution && authorsByPubkey) {
    contentResolution.profilesByPubkey = {
      ...contentResolution.profilesByPubkey,
      ...authorsByPubkey,
    };
  }

  return (
    <ul className="min-w-0">
      {articles.map((article, index) => (
        <li key={article.id ?? `article-${index}`} className="min-w-0">
          <ArticleCard
            article={article}
            author={getAuthorByPubkey(authorsByPubkey, article)}
            rank={ranked ? rankOffset + (article.ranking?.rank ?? index + 1) : undefined}
            discoverySignals={discoverySignals}
            contentResolution={contentResolution}
            showAuthor={showAuthor}
            showUtilityLinks={showUtilityLinks}
            omitZeroStats={omitZeroStats}
          />
        </li>
      ))}
    </ul>
  );
}

export function ProfilesList({
  profiles,
  ranked = false,
  discoverySignals = false,
  maxReasons,
  compact = false,
  searchContext = false,
  rankOffset = 0,
}: {
  profiles: Profile[];
  ranked?: boolean;
  discoverySignals?: boolean;
  maxReasons?: number;
  /** One-line bio, no action row. Used for conversation participants. */
  compact?: boolean;
  /** Followers, recent notes, and nip05 under each search hit. */
  searchContext?: boolean;
  /** Items skipped before this page. See `NotesList`. */
  rankOffset?: number;
}) {
  return (
    <ul>
      {profiles.map((profile, index) => (
        <li key={profile.pubkey ?? profile.npub ?? `profile-${index}`}>
          <ProfileCard
            profile={profile}
            rank={ranked ? rankOffset + (profile.ranking?.rank ?? index + 1) : undefined}
            discoverySignals={discoverySignals}
            maxReasons={maxReasons}
            compact={compact}
            searchContext={searchContext}
          />
        </li>
      ))}
    </ul>
  );
}

export function HashtagsList({
  hashtags,
  ranked = false,
  searchable = false,
  linkMode = "explorer",
  rankOffset = 0,
  continued = false,
}: {
  hashtags: Array<string | HashtagEntry>;
  ranked?: boolean;
  searchable?: boolean;
  linkMode?: "explorer" | "search";
  /** Items skipped before this page. See `NotesList`. */
  rankOffset?: number;
  /** Drop the top rule so an appended page continues the same list. */
  continued?: boolean;
}) {
  const normalized: Array<{
    hashtag: string;
    count?: number;
    href?: string;
    rank?: number;
    ranking?: HashtagEntry["ranking"];
    whyNow: ReturnType<typeof mapHashtagWhyNow>;
  }> = [];
  hashtags.forEach((entry, index) => {
    const hashtag = typeof entry === "string" ? entry : (entry.hashtag ?? "");
    const normalizedHashtag = hashtag.trim().replace(/^#/, "");
    if (normalizedHashtag.length === 0) return;
    const volume =
      typeof entry === "string" ? undefined : listedVolume([entry.event_count, entry.count]);
    if (ranked && belowVolumeFloor(volume)) return;
    const count = typeof entry === "string" ? undefined : (entry.count ?? entry.event_count);
    const href =
      searchable && normalizedHashtag.length > 0
        ? linkMode === "search"
          ? `/search?q=${encodeURIComponent(`#${normalizedHashtag}`)}&tab=all`
          : `/hashtags/${encodeURIComponent(normalizedHashtag)}`
        : undefined;
    normalized.push({
      hashtag: normalizedHashtag,
      count,
      href,
      rank: ranked
        ? rankOffset + (typeof entry === "string" ? index + 1 : (entry.ranking?.rank ?? index + 1))
        : undefined,
      ranking: typeof entry === "string" ? undefined : entry.ranking,
      whyNow: typeof entry === "string" ? [] : mapHashtagWhyNow(entry),
    });
  });
  const top = ranked ? normalized.slice(0, 3) : [];
  const rest = ranked ? normalized.slice(3) : normalized;

  if (ranked) {
    return (
      <ol
        className={`border-edge/70 divide-edge/70 divide-y ${continued ? "border-b" : "border-y"}`}
      >
        {normalized.map((entry, index) => (
          <li
            key={`${entry.hashtag}-${index}`}
            className="grid grid-cols-[2.75rem_minmax(0,1fr)_auto] items-start gap-3 py-4"
          >
            <span className="text-accent-ink pt-0.5 text-lg tracking-[-0.05em] tabular-nums">
              {String(entry.rank ?? index + 1).padStart(2, "0")}
            </span>
            <div className="min-w-0">
              {entry.href ? (
                <Link
                  href={entry.href}
                  className="text-ink hover:text-accent-ink text-base font-medium"
                >
                  {`#${entry.hashtag}`}
                </Link>
              ) : (
                <span className="text-ink text-base font-medium">{`#${entry.hashtag}`}</span>
              )}
              <WhyNow
                reasons={reasonsBesideSourceFigure(entry.ranking, entry.whyNow)}
                maxReasons={1}
                showLabel={false}
                className="mt-1.5"
              />
            </div>
            <SourceFigure ranking={entry.ranking} noun="authors" className="pt-0.5" />
          </li>
        ))}
      </ol>
    );
  }

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
                whyNow={entry.whyNow}
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
              whyNow={entry.whyNow}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

export function DomainsList({
  domains,
  ranked = false,
  searchable = false,
  rankOffset = 0,
  continued = false,
}: {
  domains: Array<string | DomainEntry>;
  ranked?: boolean;
  searchable?: boolean;
  /** Items skipped before this page. See `NotesList`. */
  rankOffset?: number;
  /** Drop the top rule so an appended page continues the same list. */
  continued?: boolean;
}) {
  const normalized: Array<{
    domain: string;
    count?: number;
    href?: string;
    rank?: number;
    ranking?: DomainEntry["ranking"];
    whyNow: ReturnType<typeof mapDomainWhyNow>;
    supportingSignal: ReturnType<typeof pickPrimaryDomainSupportingSignal>;
  }> = [];
  domains.forEach((entry, index) => {
    const domain = typeof entry === "string" ? entry : (entry.domain ?? "");
    const normalizedDomain = normalizeDomainLabel(domain);
    if (normalizedDomain.length === 0) return;
    const volume =
      typeof entry === "string"
        ? undefined
        : listedVolume([entry.link_count, entry.count, entry.event_count, entry.note_count]);
    if (ranked && belowVolumeFloor(volume)) return;
    const href =
      searchable && normalizedDomain.length > 0
        ? `/domains/${encodeURIComponent(normalizedDomain)}`
        : undefined;
    const supportingSignal =
      typeof entry === "string" ? null : pickPrimaryDomainSupportingSignal(entry);
    normalized.push({
      domain: normalizedDomain,
      count: typeof entry === "string" ? undefined : domainHeadlineCount(entry),
      href,
      rank: ranked
        ? rankOffset + (typeof entry === "string" ? index + 1 : (entry.ranking?.rank ?? index + 1))
        : undefined,
      ranking: typeof entry === "string" ? undefined : entry.ranking,
      whyNow: typeof entry === "string" ? [] : mapDomainWhyNow(entry),
      supportingSignal,
    });
  });
  const rest = ranked ? normalized.slice(3) : normalized;

  if (ranked) {
    return (
      <ol
        className={`border-edge/70 divide-edge/70 divide-y ${continued ? "border-b" : "border-y"}`}
      >
        {normalized.map((entry, index) => (
          <li
            key={`${entry.domain}-${index}`}
            className="grid grid-cols-[2.75rem_minmax(0,1fr)_auto] items-start gap-3 py-4"
          >
            <span className="text-accent-ink pt-0.5 text-lg tracking-[-0.05em] tabular-nums">
              {String(entry.rank ?? index + 1).padStart(2, "0")}
            </span>
            <div className="min-w-0">
              {entry.href ? (
                <Link
                  href={entry.href}
                  className="text-ink hover:text-accent-ink text-base font-medium"
                >
                  {entry.domain}
                </Link>
              ) : (
                <span className="text-ink text-base font-medium">{entry.domain}</span>
              )}
              <WhyNow
                reasons={reasonsBesideSourceFigure(entry.ranking, entry.whyNow)}
                maxReasons={1}
                showLabel={false}
                className="mt-1.5"
              />
            </div>
            <SourceFigure ranking={entry.ranking} className="pt-0.5" />
          </li>
        ))}
      </ol>
    );
  }

  return (
    <div className="space-y-2">
      <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {rest.map((entry, index) => (
          <li key={`${entry.domain}-${index}`}>
            <DomainChip
              domain={entry.domain}
              supportingSignal={entry.supportingSignal}
              href={entry.href}
              rank={entry.rank}
              whyNow={entry.whyNow}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
