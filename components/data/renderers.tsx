import Link from "next/link";

import { ArticleCard } from "@/components/explorer/article-card";
import { DomainChip } from "@/components/explorer/domain-chip";
import { pickPrimaryDomainSupportingSignal } from "@/components/explorer/domain-supporting-signal";
import { HashtagChip } from "@/components/explorer/hashtag-chip";
import { NoteCard } from "@/components/explorer/note-card";
import { mapDomainWhyNow, mapHashtagWhyNow, WhyNow } from "@/components/explorer/why-now";
import {
  formatCompactNumber,
  normalizeDomainLabel,
  noteInlineAuthorProfile,
} from "@/components/explorer/utils";
import { ProfileCard } from "@/components/explorer/profile-card";
import { resolveContentReferences } from "@/lib/notes/resolve-content-refs";
import {
  LONG_FORM_KIND,
  type DomainEntry,
  type EventRecord,
  type HashtagEntry,
  type Profile,
} from "@/lib/types/api";

function isLongFormEvent(note: EventRecord): boolean {
  return typeof note.kind === "number" && note.kind === LONG_FORM_KIND;
}

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
}: {
  notes: EventRecord[];
  authorsByPubkey?: Record<string, Profile>;
  ranked?: boolean;
  showFullContent?: boolean;
  discoverySignals?: boolean;
}) {
  const contents = notes
    .map((note) => (typeof note.content === "string" ? note.content : ""))
    .filter((content) => content.length > 0);
  const contentResolution = await resolveContentReferences(contents).catch(() => undefined);
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
              rank={ranked ? (note.ranking?.rank ?? index + 1) : undefined}
              discoverySignals={discoverySignals}
            />
          ) : (
            <NoteCard
              note={note}
              author={getAuthorByPubkey(authorsByPubkey, note)}
              rank={ranked ? (note.ranking?.rank ?? index + 1) : undefined}
              showFullContent={showFullContent}
              discoverySignals={discoverySignals}
              contentResolution={contentResolution}
            />
          )}
        </li>
      ))}
    </ul>
  );
}

export function ArticlesList({
  articles,
  authorsByPubkey,
  ranked = false,
  discoverySignals = false,
}: {
  articles: EventRecord[];
  authorsByPubkey?: Record<string, Profile>;
  ranked?: boolean;
  discoverySignals?: boolean;
}) {
  return (
    <ul className="min-w-0">
      {articles.map((article, index) => (
        <li key={article.id ?? `article-${index}`} className="min-w-0">
          <ArticleCard
            article={article}
            author={getAuthorByPubkey(authorsByPubkey, article)}
            rank={ranked ? (article.ranking?.rank ?? index + 1) : undefined}
            discoverySignals={discoverySignals}
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
}: {
  profiles: Profile[];
  ranked?: boolean;
  discoverySignals?: boolean;
}) {
  return (
    <ul>
      {profiles.map((profile, index) => (
        <li key={profile.pubkey ?? profile.npub ?? `profile-${index}`}>
          <ProfileCard
            profile={profile}
            rank={ranked ? (profile.ranking?.rank ?? index + 1) : undefined}
            discoverySignals={discoverySignals}
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
}: {
  hashtags: Array<string | HashtagEntry>;
  ranked?: boolean;
  searchable?: boolean;
  linkMode?: "explorer" | "search";
}) {
  const normalized: Array<{
    hashtag: string;
    count?: number;
    href?: string;
    rank?: number;
    whyNow: ReturnType<typeof mapHashtagWhyNow>;
  }> = [];
  hashtags.forEach((entry, index) => {
    const hashtag = typeof entry === "string" ? entry : (entry.hashtag ?? "");
    const normalizedHashtag = hashtag.trim().replace(/^#/, "");
    if (normalizedHashtag.length === 0) return;
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
        ? typeof entry === "string"
          ? index + 1
          : (entry.ranking?.rank ?? index + 1)
        : undefined,
      whyNow: typeof entry === "string" ? [] : mapHashtagWhyNow(entry),
    });
  });
  const top = ranked ? normalized.slice(0, 3) : [];
  const rest = ranked ? normalized.slice(3) : normalized;

  if (ranked) {
    return (
      <ol className="border-edge/70 divide-edge/70 divide-y border-y">
        {normalized.map((entry, index) => (
          <li
            key={`${entry.hashtag}-${index}`}
            className="grid grid-cols-[2.75rem_minmax(0,1fr)_auto] items-baseline gap-3 py-4"
          >
            <span className="text-accent-ink text-lg tracking-[-0.05em] tabular-nums">
              {String(entry.rank ?? index + 1).padStart(2, "0")}
            </span>
            <div className="min-w-0">
              {entry.href ? (
                <Link
                  href={entry.href}
                  className="text-ink hover:text-accent-ink text-base font-medium"
                >
                  #{entry.hashtag}
                </Link>
              ) : (
                <span className="text-ink text-base font-medium">#{entry.hashtag}</span>
              )}
              <WhyNow reasons={entry.whyNow} maxReasons={1} showLabel={false} className="mt-1.5" />
            </div>
            <span className="text-ink-muted text-xs tabular-nums">
              {typeof entry.count === "number" ? formatCompactNumber(entry.count) : "—"}
            </span>
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
}: {
  domains: Array<string | DomainEntry>;
  ranked?: boolean;
  searchable?: boolean;
}) {
  const normalized: Array<{
    domain: string;
    count?: number;
    href?: string;
    rank?: number;
    whyNow: ReturnType<typeof mapDomainWhyNow>;
    supportingSignal: ReturnType<typeof pickPrimaryDomainSupportingSignal>;
  }> = [];
  domains.forEach((entry, index) => {
    const domain = typeof entry === "string" ? entry : (entry.domain ?? "");
    const normalizedDomain = normalizeDomainLabel(domain);
    if (normalizedDomain.length === 0) return;
    const href =
      searchable && normalizedDomain.length > 0
        ? `/domains/${encodeURIComponent(normalizedDomain)}`
        : undefined;
    const supportingSignal =
      typeof entry === "string" ? null : pickPrimaryDomainSupportingSignal(entry);
    normalized.push({
      domain: normalizedDomain,
      count: typeof entry === "string" ? undefined : (entry.count ?? entry.event_count),
      href,
      rank: ranked
        ? typeof entry === "string"
          ? index + 1
          : (entry.ranking?.rank ?? index + 1)
        : undefined,
      whyNow: typeof entry === "string" ? [] : mapDomainWhyNow(entry),
      supportingSignal,
    });
  });
  const rest = ranked ? normalized.slice(3) : normalized;

  if (ranked) {
    return (
      <ol className="border-edge/70 divide-edge/70 divide-y border-y">
        {normalized.map((entry, index) => (
          <li
            key={`${entry.domain}-${index}`}
            className="grid grid-cols-[2.75rem_minmax(0,1fr)_auto] items-baseline gap-3 py-4"
          >
            <span className="text-accent-ink text-lg tracking-[-0.05em] tabular-nums">
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
              <WhyNow reasons={entry.whyNow} maxReasons={1} showLabel={false} className="mt-1.5" />
            </div>
            <span className="text-ink-muted text-xs tabular-nums">
              {typeof entry.count === "number" ? formatCompactNumber(entry.count) : "—"}
            </span>
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
