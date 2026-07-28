import Link from "next/link";
import type { Metadata } from "next";

import { EmptyState } from "@/components/explorer/empty-state";
import { DiscoveryActionLinks } from "@/components/explorer/card-grammar";
import { AboutThisData } from "@/components/explorer/about-this-data";
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
import { ErrorPanel, SoftRefreshNote } from "@/components/ui/status-panels";
import { WindowSelector } from "@/components/explorer/window-selector";
import {
  getTrendingDomains,
  getTrendingHashtags,
  getTrendingNotes,
  getTrendingProfiles,
} from "@/lib/api/endpoints";
import { getStaleDataNotice } from "@/lib/api/http";
import { extractNativeApiSemantics } from "@/lib/api/normalize";
import {
  extractEventAuthorPubkeys,
  fetchProfilesByPubkey,
  hydrateProfiles,
} from "@/lib/api/profile-hydration";
import { toUrlSearchParams } from "@/lib/search-params/pagination";
import { formatStatsWindowLabel, readStatsWindow } from "@/lib/search-params/window";
import { formatUpdatedRelative } from "@/lib/time/freshness";
import type { EventRecord, Profile } from "@/lib/types/api";
import { summarizeLoadErrors, toUserFacingErrorMessage } from "@/lib/errors/user-message";

const nextMoves = [
  {
    href: "/trending/long-form",
    title: "Trending long-form",
    description: "Read the long-form articles leading the network.",
  },
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

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function TrendingPage({ searchParams }: { searchParams: SearchParams }) {
  const resolvedSearchParams = await searchParams;
  const currentSearchParams = toUrlSearchParams(resolvedSearchParams);
  const window = readStatsWindow(resolvedSearchParams);
  const normalizeUnixSeconds = (value: unknown): number | null => {
    if (typeof value !== "number" || !Number.isFinite(value)) return null;
    if (value > 1_000_000_000_000) return Math.floor(value / 1000);
    if (value > 1_000_000_000) return Math.floor(value);
    return null;
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
  const trendWindowLabel = formatStatsWindowLabel(window);
  let errorMessage = "";
  let authorsByPubkey: Record<string, Profile> = {};
  let hydratedProfiles: Profile[] = [];
  const [notesResult, profilesResult, hashtagsResult, domainsResult] = await Promise.allSettled([
    getTrendingNotes("shortTtl", { window }),
    getTrendingProfiles("shortTtl", { window }),
    getTrendingHashtags("shortTtl", { window }),
    getTrendingDomains("shortTtl", { window }),
  ]);

  const notes = notesResult.status === "fulfilled" ? notesResult.value : null;
  const profiles = profilesResult.status === "fulfilled" ? profilesResult.value : null;
  const hashtags = hashtagsResult.status === "fulfilled" ? hashtagsResult.value : null;
  const domains = domainsResult.status === "fulfilled" ? domainsResult.value : null;

  const errors = [notesResult, profilesResult, hashtagsResult, domainsResult]
    .filter((result): result is PromiseRejectedResult => result.status === "rejected")
    .map((result) => toUserFacingErrorMessage(result.reason, "Trending request failed."));
  errorMessage = summarizeLoadErrors(errors) ?? "";

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
  const notesFreshness = formatUpdatedRelative(notes?.notes?.[0]?.created_at);
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
    formatUpdatedRelative(latestProfileActivity) ??
    formatUpdatedRelative(notes?.notes?.[0]?.created_at);
  const hashtagsFreshness = formatUpdatedRelative(notes?.notes?.[0]?.created_at);
  const domainsFreshness = formatUpdatedRelative(notes?.notes?.[0]?.created_at);
  const staleNotice = getStaleDataNotice();
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
            <WindowSelector
              path="/trending"
              searchParams={currentSearchParams}
              activeWindow={window}
            />
            <span className="border-edge-strong text-ink-dim rounded-full border px-2 py-0.5">
              {trendWindowLabel}
            </span>
            <span className="text-ink-muted">
              Notes {(notes?.notes?.length ?? 0).toLocaleString()} • Profiles{" "}
              {(profiles?.profiles?.length ?? 0).toLocaleString()} • Hashtags{" "}
              {(hashtags?.hashtags?.length ?? 0).toLocaleString()} • Domains{" "}
              {(domains?.domains?.length ?? 0).toLocaleString()}
            </span>
          </div>
        }
      />
      {staleNotice ? <SoftRefreshNote message={staleNotice} /> : null}
      {errorMessage ? (
        (notes?.notes?.length ?? 0) > 0 || (profiles?.profiles?.length ?? 0) > 0 ? (
          <SoftRefreshNote message={errorMessage} />
        ) : (
          <ErrorPanel message={errorMessage} />
        )
      ) : null}
      <div className="space-y-5">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]">
          <SectionCard
            title="Notes setting the pace"
            description="Lead note spotlight with a tighter ranked follow-up list."
          >
            <div className="text-ink-muted mb-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] sm:mb-4">
              <span>{trendWindowLabel}</span>
              {notesFreshness ? (
                <>
                  <span aria-hidden className="text-ink-faint/70">
                    •
                  </span>
                  <span>{notesFreshness}</span>
                </>
              ) : null}
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
                  <ol className="border-edge/80 bg-surface-sunken/35 space-y-2 rounded-lg border p-2.5 sm:p-3">
                    {followupNotes.map((note, index) => {
                      const rank = index + 2;
                      const author = resolveNoteAuthor(note, authorsByPubkey);
                      const noteId = noteRouteId(note);
                      const observedAt = formatObservedAt(note.created_at);
                      const preview = getNotePreviewPresentation(note);
                      return (
                        <li
                          key={note.id ?? note.event_id ?? note.eventId ?? `note-followup-${rank}`}
                          className="hover:bg-surface/40 rounded-lg p-2.5 transition-colors"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 space-y-1">
                              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                                <span className="text-link font-medium">#{rank}</span>
                                <span className="text-ink-soft truncate">
                                  {author ? profileLabel(author) : "Unknown author"}
                                </span>
                                {observedAt ? (
                                  <span className="text-ink-faint">{observedAt}</span>
                                ) : null}
                              </div>
                              <p className="text-ink-dim text-sm leading-5">
                                {preview.contentForCard}
                              </p>
                            </div>
                            {noteId ? (
                              <Link
                                href={`/notes/${encodeURIComponent(noteId)}`}
                                className="text-link hover:text-link-hover shrink-0 text-xs"
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
              actions={[
                { label: "See all notes", href: "/trending/notes" },
                { label: "See long-form", href: "/trending/long-form" },
              ]}
              className="mt-3"
            />
            {trendingNotesContinuationHref ? (
              <Link
                href={trendingNotesContinuationHref}
                className="text-link hover:text-link-hover mt-2 inline-block text-xs"
              >
                Load more notes
              </Link>
            ) : null}
          </SectionCard>

          <section className="border-edge/95 bg-surface/45 rounded-xl border p-3.5 sm:p-4">
            <header className="mb-3 space-y-1">
              <h2 className="text-ink text-base font-semibold tracking-tight">
                Profiles in motion
              </h2>
              <p className="text-ink-muted text-sm leading-5">
                Fast-ranked profile list for quick identity scanning.
              </p>
            </header>
            <div className="text-ink-muted mb-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px]">
              <span>{trendWindowLabel}</span>
              {profilesFreshness ? (
                <>
                  <span aria-hidden className="text-ink-faint/70">
                    •
                  </span>
                  <span>{profilesFreshness}</span>
                </>
              ) : null}
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
                      className="border-edge/80 bg-surface-sunken/35 flex items-center justify-between gap-3 rounded-md border px-2.5 py-2"
                    >
                      <div className="min-w-0">
                        <div className="flex min-w-0 items-center gap-2 text-sm">
                          <span className="text-success-ink shrink-0 text-xs font-medium">
                            #{rank}
                          </span>
                          {profileHref ? (
                            <Link
                              href={profileHref}
                              className="text-ink-soft hover:text-ink-strong truncate"
                            >
                              {profileLabel(profile)}
                            </Link>
                          ) : (
                            <span className="text-ink-soft truncate">{profileLabel(profile)}</span>
                          )}
                        </div>
                        {secondary ? (
                          <p className="text-ink-faint truncate text-xs">{secondary}</p>
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
                          className="text-link hover:text-link-hover shrink-0 text-xs"
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
                className="text-link hover:text-link-hover mt-2 inline-block text-xs"
              >
                Load more profiles
              </Link>
            ) : null}
          </section>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <section className="border-edge/90 bg-surface-sunken/35 rounded-xl border p-3.5 sm:p-4">
            <header className="mb-3 space-y-1">
              <h2 className="text-ink text-base font-semibold tracking-tight">
                Hashtags gaining speed
              </h2>
              <p className="text-ink-muted text-sm leading-5">
                Ranked topic intelligence with quick jump links.
              </p>
            </header>
            <div className="text-ink-muted mb-2.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px]">
              <span>{trendWindowLabel}</span>
              {hashtagsFreshness ? (
                <>
                  <span aria-hidden className="text-ink-faint/70">
                    •
                  </span>
                  <span>{hashtagsFreshness}</span>
                </>
              ) : null}
            </div>
            {hashtagEntries.length > 0 ? (
              <ol className="divide-edge/70 border-edge/80 bg-surface-sunken/45 divide-y rounded-lg border">
                {hashtagEntries.map((entry) => (
                  <li key={entry.hashtag} className="px-2.5 py-2 text-sm">
                    <div className="flex items-center gap-3">
                      <span className="text-link w-6 shrink-0 text-xs font-medium">
                        #{entry.rank}
                      </span>
                      <Link
                        href={entry.href}
                        className="text-ink-soft hover:text-ink-strong min-w-0 flex-1 truncate"
                      >
                        #{entry.hashtag}
                      </Link>
                      <span className="text-ink-muted shrink-0 text-xs">
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
                className="text-link hover:text-link-hover mt-2 inline-block text-xs"
              >
                Load more hashtags
              </Link>
            ) : null}
          </section>

          <section className="border-edge/90 bg-surface-sunken/35 rounded-xl border p-3.5 sm:p-4">
            <header className="mb-3 space-y-1">
              <h2 className="text-ink text-base font-semibold tracking-tight">
                Domains gaining traction
              </h2>
              <p className="text-ink-muted text-sm leading-5">
                Compact ranked links with cleaner right-side pickup counts.
              </p>
            </header>
            <div className="text-ink-muted mb-2.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px]">
              <span>{trendWindowLabel}</span>
              {domainsFreshness ? (
                <>
                  <span aria-hidden className="text-ink-faint/70">
                    •
                  </span>
                  <span>{domainsFreshness}</span>
                </>
              ) : null}
            </div>
            {domainEntries.length > 0 ? (
              <ol className="divide-edge/70 border-edge/80 bg-surface-sunken/45 divide-y rounded-lg border">
                {domainEntries.map((entry) => (
                  <li key={entry.domain} className="px-2.5 py-2 text-sm">
                    <div className="flex items-center gap-3">
                      <span className="text-link w-6 shrink-0 text-xs font-medium">
                        #{entry.rank}
                      </span>
                      <Link
                        href={entry.href}
                        className="text-ink-soft hover:text-ink-strong min-w-0 flex-1 truncate"
                      >
                        {entry.domain}
                      </Link>
                      <span className="text-ink-muted shrink-0 text-xs">
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
                className="text-link hover:text-link-hover mt-2 inline-block text-xs"
              >
                Load more domains
              </Link>
            ) : null}
          </section>
        </div>

        <section className="border-edge/80 bg-surface-sunken/20 rounded-lg border p-3 sm:p-4">
          <header className="mb-2.5">
            <h2 className="text-ink-soft text-sm font-semibold tracking-tight">Next moves</h2>
            <p className="text-ink-faint text-xs">Jump into adjacent discovery surfaces.</p>
          </header>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {nextMoves.map((section) => (
              <Link
                key={section.href}
                href={section.href}
                className="border-edge/80 bg-surface/35 hover:border-accent/35 hover:bg-surface/65 rounded-md border px-2.5 py-2 transition"
              >
                <p className="text-ink text-xs font-medium">{section.title}</p>
                <p className="text-ink-muted mt-0.5 text-[11px] leading-4">{section.description}</p>
              </Link>
            ))}
          </div>
        </section>
      </div>
      <AboutThisData semantics={semantics} />
    </div>
  );
}
