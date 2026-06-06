import Link from "next/link";
import type { Metadata } from "next";

import { EmptyState } from "@/components/explorer/empty-state";
import { DiscoveryActionLinks } from "@/components/explorer/card-grammar";
import { NativeSemanticsBadges } from "@/components/explorer/native-semantics-badges";
import { PageHero } from "@/components/explorer/page-hero";
import { NoteCard } from "@/components/explorer/note-card";
import { getNotePreviewPresentation } from "@/components/explorer/note-preview";
import {
  mapDomainWhyNow,
  mapHashtagWhyNow,
  mapProfileWhyNow,
  WhyNow,
} from "@/components/explorer/why-now";
import {
  normalizeDomainLabel,
  noteInlineAuthorProfile,
  profileIdentifier,
  profileLabel,
  profileSecondaryLabel,
} from "@/components/explorer/utils";
import { SectionCard } from "@/components/ui/section-card";
import { ErrorPanel } from "@/components/ui/status-panels";
import {
  getTrendingDomains,
  getTrendingHashtags,
  getTrendingNotes,
  getTrendingProfiles,
} from "@/lib/api/endpoints";
import { extractNativeApiSemantics } from "@/lib/api/normalize";
import {
  extractEventAuthorPubkeys,
  fetchProfilesByPubkey,
  hydrateProfiles,
} from "@/lib/api/profile-hydration";
import type { EventRecord, Profile } from "@/lib/types/api";

const nextMoves = [
  {
    href: "/discovery/conversations/hot",
    title: "Hot conversations",
    description: "Follow the threads pulling in the most replies now.",
  },
  {
    href: "/discovery/profiles/rising",
    title: "Rising profiles",
    description: "Catch emerging accounts before they hit the top ranks.",
  },
  {
    href: "/relays",
    title: "Relay explorer",
    description: "Inspect active relays and drill into relay detail pages.",
  },
  {
    href: "/relays/health",
    title: "Relay health",
    description: "Review relay availability and current health signals.",
  },
];

export const metadata: Metadata = {
  title: "Trending",
  description:
    "Explore what is trending now across notes, profiles, hashtags, domains, and relays.",
};

export default async function TrendingPage() {
  const normalizeUnixSeconds = (value: unknown): number | null => {
    if (typeof value !== "number" || !Number.isFinite(value)) return null;
    if (value > 1_000_000_000_000) return Math.floor(value / 1000);
    if (value > 1_000_000_000) return Math.floor(value);
    return null;
  };
  const formatFreshness = (value: unknown): string | null => {
    const unixSeconds = normalizeUnixSeconds(value);
    if (!unixSeconds) return null;
    const observedAt = new Date(unixSeconds * 1000);
    if (Number.isNaN(observedAt.getTime())) return null;
    return `Updated ${observedAt.toLocaleString()}`;
  };
  const formatObservedAt = (value: unknown): string | null => {
    const unixSeconds = normalizeUnixSeconds(value);
    if (!unixSeconds) return null;
    const observedAt = new Date(unixSeconds * 1000);
    if (Number.isNaN(observedAt.getTime())) return null;
    return observedAt.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };
  const noteRouteId = (note: EventRecord): string | null => {
    const candidate =
      (typeof note.id === "string" && note.id.length > 0
        ? note.id
        : typeof note.event_id === "string" && note.event_id.length > 0
          ? note.event_id
          : typeof note.eventId === "string" && note.eventId.length > 0
            ? note.eventId
            : null) ?? null;
    return candidate;
  };
  const resolveNoteAuthor = (
    note: EventRecord,
    fallbackAuthorsByPubkey: Record<string, Profile>
  ): Profile | undefined => {
    const inlineAuthor = noteInlineAuthorProfile(note);
    if (inlineAuthor) return inlineAuthor;
    const pubkey = typeof note.pubkey === "string" ? note.pubkey.trim().toLowerCase() : "";
    if (pubkey.length === 0) return undefined;
    const rawPubkey = typeof note.pubkey === "string" ? note.pubkey : "";
    return fallbackAuthorsByPubkey[pubkey] ?? fallbackAuthorsByPubkey[rawPubkey];
  };
  const normalizeCount = (value: unknown): number | null => {
    if (typeof value !== "number" || !Number.isFinite(value)) return null;
    return value;
  };
  const trendWindowLabel = "Last 24h";
  let errorMessage = "";
  let authorsByPubkey: Record<string, Profile> = {};
  let hydratedProfiles: Profile[] = [];
  const [notesResult, profilesResult, hashtagsResult, domainsResult] = await Promise.allSettled([
    getTrendingNotes("shortTtl"),
    getTrendingProfiles("shortTtl"),
    getTrendingHashtags("shortTtl"),
    getTrendingDomains("shortTtl"),
  ]);

  const notes = notesResult.status === "fulfilled" ? notesResult.value : null;
  const profiles = profilesResult.status === "fulfilled" ? profilesResult.value : null;
  const hashtags = hashtagsResult.status === "fulfilled" ? hashtagsResult.value : null;
  const domains = domainsResult.status === "fulfilled" ? domainsResult.value : null;

  const errors = [notesResult, profilesResult, hashtagsResult, domainsResult]
    .filter((result): result is PromiseRejectedResult => result.status === "rejected")
    .map((result) =>
      result.reason instanceof Error ? result.reason.message : "Trending request failed."
    );
  if (errors.length > 0) {
    errorMessage = errors.join(" | ");
  }

  if (notes?.notes?.length) {
    try {
      authorsByPubkey = await fetchProfilesByPubkey(
        extractEventAuthorPubkeys(notes.notes.slice(0, 3)),
        "shortTtl"
      );
    } catch {
      authorsByPubkey = {};
    }
  }

  if (profiles?.profiles?.length) {
    try {
      hydratedProfiles = await hydrateProfiles(profiles.profiles.slice(0, 5), "shortTtl");
    } catch {
      hydratedProfiles = profiles.profiles;
    }
  }
  const trendingNotesContinuationHref =
    typeof notes?.next_cursor === "string" && notes.next_cursor.length > 0
      ? `/trending/notes?cursor=${encodeURIComponent(notes.next_cursor)}`
      : null;
  const trendingProfilesContinuationHref =
    typeof profiles?.next_cursor === "string" && profiles.next_cursor.length > 0
      ? `/trending/profiles?cursor=${encodeURIComponent(profiles.next_cursor)}`
      : null;
  const trendingHashtagsContinuationHref =
    typeof hashtags?.next_cursor === "string" && hashtags.next_cursor.length > 0
      ? `/trending/hashtags?cursor=${encodeURIComponent(hashtags.next_cursor)}`
      : null;
  const trendingDomainsContinuationHref =
    typeof domains?.next_cursor === "string" && domains.next_cursor.length > 0
      ? `/trending/domains?cursor=${encodeURIComponent(domains.next_cursor)}`
      : null;
  const notesFreshness = formatFreshness(notes?.notes?.[0]?.created_at) ?? "Updated recently";
  const profileActivityCandidates = hydratedProfiles
    .map((profile) =>
      [
        profile.recent_activity_at,
        profile.last_activity_at,
        profile.updated_at,
        profile.created_at,
      ].map(normalizeUnixSeconds)
    )
    .flat()
    .filter((value): value is number => typeof value === "number");
  const latestProfileActivity =
    profileActivityCandidates.length > 0 ? Math.max(...profileActivityCandidates) : null;
  const profilesFreshness =
    formatFreshness(latestProfileActivity) ??
    formatFreshness(notes?.notes?.[0]?.created_at) ??
    "Updated recently";
  const hashtagsFreshness = formatFreshness(notes?.notes?.[0]?.created_at) ?? "Updated recently";
  const domainsFreshness = formatFreshness(notes?.notes?.[0]?.created_at) ?? "Updated recently";
  const semantics = extractNativeApiSemantics(notes, profiles, hashtags, domains);
  const rankedNotes = notes?.notes?.slice(0, 4) ?? [];
  const leadNote = rankedNotes[0];
  const followupNotes = rankedNotes.slice(1);
  const compactProfiles = hydratedProfiles.slice(0, 6);
  const hashtagEntries = (hashtags?.hashtags ?? [])
    .map((entry, index) => {
      const hashtag = typeof entry === "string" ? entry : (entry.hashtag ?? "");
      const normalizedHashtag = hashtag.trim().replace(/^#/, "").toLowerCase();
      if (normalizedHashtag.length === 0) return null;
      const count = typeof entry === "string" ? null : normalizeCount(entry.count);
      const eventCount = typeof entry === "string" ? null : normalizeCount(entry.event_count);
      const uniqueAuthors = typeof entry === "string" ? null : normalizeCount(entry.unique_authors);
      return {
        rank: index + 1,
        hashtag: normalizedHashtag,
        count,
        eventCount,
        uniqueAuthors,
        href: `/hashtags/${encodeURIComponent(normalizedHashtag)}`,
      };
    })
    .filter(
      (
        entry
      ): entry is {
        rank: number;
        hashtag: string;
        count: number | null;
        eventCount: number | null;
        uniqueAuthors: number | null;
        href: string;
      } => Boolean(entry)
    )
    .slice(0, 10);
  const domainEntries = (domains?.domains ?? [])
    .map((entry, index) => {
      const domain = typeof entry === "string" ? entry : (entry.domain ?? "");
      const normalizedDomain = normalizeDomainLabel(domain);
      if (normalizedDomain.length === 0) return null;
      const count = typeof entry === "string" ? null : normalizeCount(entry.count);
      const eventCount = typeof entry === "string" ? null : normalizeCount(entry.event_count);
      const uniqueAuthors = typeof entry === "string" ? null : normalizeCount(entry.unique_authors);
      return {
        rank: index + 1,
        domain: normalizedDomain,
        count,
        eventCount,
        uniqueAuthors,
        href: `/domains/${encodeURIComponent(normalizedDomain)}`,
      };
    })
    .filter(
      (
        entry
      ): entry is {
        rank: number;
        domain: string;
        count: number | null;
        eventCount: number | null;
        uniqueAuthors: number | null;
        href: string;
      } => Boolean(entry)
    )
    .slice(0, 10);

  return (
    <div className="space-y-7">
      <PageHero
        eyebrow="Trending now"
        title="Trending now"
        subtitle="Scan the strongest note, profile, topic, and link signals in one pass."
        className="space-y-3 p-3.5 sm:p-4"
        badges={
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px]">
            <NativeSemanticsBadges semantics={semantics} />
            <span className="text-zinc-400">
              Notes {(notes?.notes?.length ?? 0).toLocaleString()} • Profiles{" "}
              {(profiles?.profiles?.length ?? 0).toLocaleString()} • Hashtags{" "}
              {(hashtags?.hashtags?.length ?? 0).toLocaleString()} • Domains{" "}
              {(domains?.domains?.length ?? 0).toLocaleString()}
            </span>
          </div>
        }
      />
      {errorMessage ? <ErrorPanel message={errorMessage} /> : null}
      <div className="space-y-5">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]">
          <SectionCard
            title="Notes setting the pace"
            description="Lead note spotlight with a tighter ranked follow-up list."
          >
            <div className="mb-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-zinc-400 sm:mb-4">
              <span>{trendWindowLabel}</span>
              <span className="text-zinc-600">•</span>
              <span>{notesFreshness}</span>
            </div>
            {leadNote ? (
              <div className="space-y-3">
                <NoteCard
                  note={leadNote}
                  author={resolveNoteAuthor(leadNote, authorsByPubkey)}
                  rank={1}
                  discoverySignals
                />
                {followupNotes.length > 0 ? (
                  <ol className="space-y-2 rounded-lg border border-zinc-800/80 bg-zinc-950/35 p-2.5 sm:p-3">
                    {followupNotes.map((note, index) => {
                      const rank = index + 2;
                      const author = resolveNoteAuthor(note, authorsByPubkey);
                      const noteId = noteRouteId(note);
                      const observedAt = formatObservedAt(note.created_at);
                      const preview = getNotePreviewPresentation(note);
                      return (
                        <li
                          key={note.id ?? note.event_id ?? note.eventId ?? `note-followup-${rank}`}
                          className="rounded-md border border-zinc-800/80 bg-zinc-900/40 p-2.5"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 space-y-1">
                              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                                <span className="font-medium text-indigo-300">#{rank}</span>
                                <span className="truncate text-zinc-200">
                                  {author ? profileLabel(author) : "Unknown author"}
                                </span>
                                {observedAt ? (
                                  <span className="text-zinc-500">{observedAt}</span>
                                ) : null}
                              </div>
                              <p className="text-sm leading-5 text-zinc-300">
                                {preview.contentForCard}
                              </p>
                            </div>
                            {noteId ? (
                              <Link
                                href={`/notes/${encodeURIComponent(noteId)}`}
                                className="shrink-0 text-xs text-indigo-300 hover:text-indigo-200"
                              >
                                Open note
                              </Link>
                            ) : null}
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                ) : null}
              </div>
            ) : (
              <EmptyState
                title="No ranked notes yet"
                message="Ranked notes have not populated for this window."
              />
            )}
            <DiscoveryActionLinks
              actions={[{ label: "See all notes", href: "/trending/notes" }]}
              className="mt-3"
            />
            {trendingNotesContinuationHref ? (
              <Link
                href={trendingNotesContinuationHref}
                className="mt-2 inline-block text-xs text-indigo-300 hover:text-indigo-200"
              >
                Load more notes
              </Link>
            ) : null}
          </SectionCard>

          <section className="rounded-xl border border-zinc-800/95 bg-zinc-900/45 p-3.5 sm:p-4">
            <header className="mb-3 space-y-1">
              <h2 className="text-base font-semibold tracking-tight text-zinc-100">
                Profiles in motion
              </h2>
              <p className="text-sm leading-5 text-zinc-400">
                Fast-ranked profile list for quick identity scanning.
              </p>
            </header>
            <div className="mb-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-zinc-400">
              <span>{trendWindowLabel}</span>
              <span className="text-zinc-600">•</span>
              <span>{profilesFreshness}</span>
            </div>
            {compactProfiles.length > 0 ? (
              <ol className="space-y-1.5">
                {compactProfiles.map((profile, index) => {
                  const rank = index + 1;
                  const identifier = profileIdentifier(profile);
                  const secondary = profileSecondaryLabel(profile);
                  const profileHref =
                    identifier !== "unknown" ? `/profiles/${encodeURIComponent(identifier)}` : null;
                  return (
                    <li
                      key={profile.pubkey ?? profile.npub ?? `profile-${rank}`}
                      className="flex items-center justify-between gap-3 rounded-md border border-zinc-800/80 bg-zinc-950/35 px-2.5 py-2"
                    >
                      <div className="min-w-0">
                        <div className="flex min-w-0 items-center gap-2 text-sm">
                          <span className="shrink-0 text-xs font-medium text-emerald-300">
                            #{rank}
                          </span>
                          {profileHref ? (
                            <Link
                              href={profileHref}
                              className="truncate text-zinc-200 hover:text-white"
                            >
                              {profileLabel(profile)}
                            </Link>
                          ) : (
                            <span className="truncate text-zinc-200">{profileLabel(profile)}</span>
                          )}
                        </div>
                        {secondary ? (
                          <p className="truncate text-xs text-zinc-500">{secondary}</p>
                        ) : null}
                        {rank <= 2 ? (
                          <WhyNow
                            reasons={mapProfileWhyNow(profile)}
                            maxReasons={1}
                            className="mt-1.5"
                          />
                        ) : null}
                      </div>
                      {profileHref ? (
                        <Link
                          href={profileHref}
                          className="shrink-0 text-xs text-indigo-300 hover:text-indigo-200"
                        >
                          View
                        </Link>
                      ) : null}
                    </li>
                  );
                })}
              </ol>
            ) : (
              <EmptyState
                title="No ranked profiles yet"
                message="Ranked profiles have not populated for this window."
              />
            )}
            <DiscoveryActionLinks
              actions={[
                { label: "See all profiles", href: "/trending/profiles" },
                { label: "Open rising view", href: "/discovery/profiles/rising" },
              ]}
              className="mt-3"
            />
            {trendingProfilesContinuationHref ? (
              <Link
                href={trendingProfilesContinuationHref}
                className="mt-2 inline-block text-xs text-indigo-300 hover:text-indigo-200"
              >
                Load more profiles
              </Link>
            ) : null}
          </section>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <section className="rounded-xl border border-zinc-800/90 bg-zinc-950/35 p-3.5 sm:p-4">
            <header className="mb-3 space-y-1">
              <h2 className="text-base font-semibold tracking-tight text-zinc-100">
                Hashtags gaining speed
              </h2>
              <p className="text-sm leading-5 text-zinc-400">
                Ranked topic intelligence with quick jump links.
              </p>
            </header>
            <div className="mb-2.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-zinc-400">
              <span>{trendWindowLabel}</span>
              <span className="text-zinc-600">•</span>
              <span>{hashtagsFreshness}</span>
            </div>
            {hashtagEntries.length > 0 ? (
              <ol className="divide-y divide-zinc-800/70 rounded-lg border border-zinc-800/80 bg-zinc-950/45">
                {hashtagEntries.map((entry) => (
                  <li key={entry.hashtag} className="px-2.5 py-2 text-sm">
                    <div className="flex items-center gap-3">
                      <span className="w-6 shrink-0 text-xs font-medium text-indigo-300">
                        #{entry.rank}
                      </span>
                      <Link
                        href={entry.href}
                        className="min-w-0 flex-1 truncate text-zinc-200 hover:text-white"
                      >
                        #{entry.hashtag}
                      </Link>
                      <span className="shrink-0 text-xs text-zinc-400">
                        {entry.count !== null ? entry.count.toLocaleString() : "—"}
                      </span>
                    </div>
                    {entry.rank <= 3 ? (
                      <WhyNow
                        reasons={mapHashtagWhyNow({
                          hashtag: entry.hashtag,
                          count: entry.count ?? undefined,
                          event_count: entry.eventCount ?? undefined,
                          unique_authors: entry.uniqueAuthors ?? undefined,
                        })}
                        maxReasons={1}
                        className="mt-1.5 ml-9"
                      />
                    ) : null}
                  </li>
                ))}
              </ol>
            ) : (
              <EmptyState
                title="No ranked hashtags yet"
                message="Ranked hashtags have not populated for this window."
              />
            )}
            <DiscoveryActionLinks
              actions={[
                { label: "See all hashtags", href: "/trending/hashtags" },
                { label: "Search related notes", href: "/search?tab=all" },
              ]}
              className="mt-3"
            />
            {trendingHashtagsContinuationHref ? (
              <Link
                href={trendingHashtagsContinuationHref}
                className="mt-2 inline-block text-xs text-indigo-300 hover:text-indigo-200"
              >
                Load more hashtags
              </Link>
            ) : null}
          </section>

          <section className="rounded-xl border border-zinc-800/90 bg-zinc-950/35 p-3.5 sm:p-4">
            <header className="mb-3 space-y-1">
              <h2 className="text-base font-semibold tracking-tight text-zinc-100">
                Domains gaining traction
              </h2>
              <p className="text-sm leading-5 text-zinc-400">
                Compact ranked links with cleaner right-side pickup counts.
              </p>
            </header>
            <div className="mb-2.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-zinc-400">
              <span>{trendWindowLabel}</span>
              <span className="text-zinc-600">•</span>
              <span>{domainsFreshness}</span>
            </div>
            {domainEntries.length > 0 ? (
              <ol className="divide-y divide-zinc-800/70 rounded-lg border border-zinc-800/80 bg-zinc-950/45">
                {domainEntries.map((entry) => (
                  <li key={entry.domain} className="px-2.5 py-2 text-sm">
                    <div className="flex items-center gap-3">
                      <span className="w-6 shrink-0 text-xs font-medium text-indigo-300">
                        #{entry.rank}
                      </span>
                      <Link
                        href={entry.href}
                        className="min-w-0 flex-1 truncate text-zinc-200 hover:text-white"
                      >
                        {entry.domain}
                      </Link>
                      <span className="shrink-0 text-xs text-zinc-400">
                        {entry.count !== null ? entry.count.toLocaleString() : "—"}
                      </span>
                    </div>
                    {entry.rank <= 3 ? (
                      <WhyNow
                        reasons={mapDomainWhyNow({
                          domain: entry.domain,
                          count: entry.count ?? undefined,
                          event_count: entry.eventCount ?? undefined,
                          unique_authors: entry.uniqueAuthors ?? undefined,
                        })}
                        maxReasons={1}
                        className="mt-1.5 ml-9"
                      />
                    ) : null}
                  </li>
                ))}
              </ol>
            ) : (
              <EmptyState
                title="No ranked domains yet"
                message="Ranked domains have not populated for this window."
              />
            )}
            <DiscoveryActionLinks
              actions={[
                { label: "See all domains", href: "/trending/domains" },
                { label: "Search linked notes", href: "/search?tab=all" },
              ]}
              className="mt-3"
            />
            {trendingDomainsContinuationHref ? (
              <Link
                href={trendingDomainsContinuationHref}
                className="mt-2 inline-block text-xs text-indigo-300 hover:text-indigo-200"
              >
                Load more domains
              </Link>
            ) : null}
          </section>
        </div>

        <section className="rounded-lg border border-zinc-800/80 bg-zinc-950/20 p-3 sm:p-4">
          <header className="mb-2.5">
            <h2 className="text-sm font-semibold tracking-tight text-zinc-200">Next moves</h2>
            <p className="text-xs text-zinc-500">Jump into adjacent discovery surfaces.</p>
          </header>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {nextMoves.map((section) => (
              <Link
                key={section.href}
                href={section.href}
                className="rounded-md border border-zinc-800/80 bg-zinc-900/35 px-2.5 py-2 transition hover:border-indigo-500/35 hover:bg-zinc-900/65"
              >
                <p className="text-xs font-medium text-zinc-100">{section.title}</p>
                <p className="mt-0.5 text-[11px] leading-4 text-zinc-400">{section.description}</p>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
