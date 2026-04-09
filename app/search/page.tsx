import type { Metadata } from "next";
import Link from "next/link";

import { DebugDisclosure } from "@/components/explorer/debug-disclosure";
import { EmptyState } from "@/components/explorer/empty-state";
import { NativeSemanticsBadges } from "@/components/explorer/native-semantics-badges";
import { PageHero } from "@/components/explorer/page-hero";
import { SearchForm } from "@/components/search/search-form";
import { NotesList, ProfilesList, HashtagsList } from "@/components/data/renderers";
import { SectionCard } from "@/components/ui/section-card";
import { ErrorPanel } from "@/components/ui/status-panels";
import { getSearch, getTrendingHashtags, getTrendingProfiles } from "@/lib/api/endpoints";
import { extractEventAuthorPubkeys, fetchProfilesByPubkey } from "@/lib/api/profile-hydration";
import { parseSearchQuery } from "@/lib/search-params/search";
import type { Profile } from "@/lib/types/api";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export const metadata: Metadata = {
  title: "Search",
  description: "Search notes, profiles, and hashtag activity across NostrMash indexed data.",
};

type SearchTab = NonNullable<Awaited<ReturnType<typeof parseSearchQuery>>["tab"]>;

const SEARCH_TABS: Array<{ key: SearchTab; label: string }> = [
  { key: "all", label: "All" },
  { key: "notes", label: "Notes" },
  { key: "profiles", label: "Profiles" },
];

export default async function SearchPage({ searchParams }: { searchParams: SearchParams }) {
  const query = parseSearchQuery(await searchParams);
  const activeTab = query.tab ?? "all";
  const canQuery = query.q.length > 0;
  let errorMessage = "";
  let payload: Awaited<ReturnType<typeof getSearch>> | null = null;
  let noteAuthorsByPubkey: Record<string, Profile> = {};
  let suggestedProfiles: Profile[] = [];
  let hydratedProfiles: Profile[] = [];
  let hydratedSuggestedProfiles: Profile[] = [];
  let fallbackSuggestedProfiles: Profile[] = [];
  let fallbackSuggestedHashtags: Array<{ hashtag?: string; count?: number }> = [];

  if (canQuery) {
    try {
      payload = await getSearch(query, "requestTime");
      suggestedProfiles = payload.profile_suggestions ?? [];
      hydratedProfiles = payload.profiles ?? [];
      hydratedSuggestedProfiles = suggestedProfiles;
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : "Search failed.";
    }
  }

  if (payload?.notes?.length) {
    try {
      noteAuthorsByPubkey = await fetchProfilesByPubkey(
        extractEventAuthorPubkeys(payload.notes ?? []),
        "requestTime"
      );
    } catch {
      noteAuthorsByPubkey = {};
    }
  }

  if (
    canQuery &&
    activeTab === "all" &&
    payload &&
    (suggestedProfiles.length === 0 || (payload.hashtags?.length ?? 0) === 0)
  ) {
    try {
      const [trendingProfiles, trendingHashtags] = await Promise.all([
        getTrendingProfiles("shortTtl"),
        getTrendingHashtags("shortTtl"),
      ]);
      if (suggestedProfiles.length === 0) {
        fallbackSuggestedProfiles = (trendingProfiles.profiles ?? []).slice(0, 5);
      }
      if ((payload.hashtags?.length ?? 0) === 0) {
        fallbackSuggestedHashtags = (trendingHashtags.hashtags ?? []).slice(0, 10);
      }
    } catch {
      fallbackSuggestedProfiles = [];
      fallbackSuggestedHashtags = [];
    }
  }

  const sectionTotals = payload?.section_totals ?? {};
  const surfaceErrors = payload?.surface_errors ?? {};
  const surfaceCursors = payload?.surface_cursors ?? {};
  const tabCounts: Record<SearchTab, number | undefined> = {
    all: typeof payload?.total === "number" ? payload.total : undefined,
    notes: typeof sectionTotals.notes === "number" ? sectionTotals.notes : payload?.notes?.length,
    profiles:
      typeof sectionTotals.profiles === "number"
        ? sectionTotals.profiles
        : payload?.profiles?.length,
  };
  const visibleSections = {
    notes: activeTab === "all" || activeTab === "notes",
    profiles: activeTab === "all" || activeTab === "profiles",
    suggest: activeTab === "all",
    hashtags: activeTab === "all",
    relays: activeTab === "all",
  };
  const searchHref = (overrides: Partial<{ tab: SearchTab; cursor: string | undefined }>) => {
    const params = new URLSearchParams();
    params.set("q", query.q);
    params.set("tab", overrides.tab ?? activeTab);
    if (typeof query.limit === "number") {
      params.set("limit", String(query.limit));
    }
    const cursorValue = overrides.cursor;
    if (cursorValue && cursorValue.length > 0) {
      params.set("cursor", cursorValue);
    }
    return `/search?${params.toString()}`;
  };
  const notesCursor =
    surfaceCursors.notes ?? (activeTab === "notes" ? payload?.next_cursor : undefined);
  const profilesCursor =
    surfaceCursors.profiles ?? (activeTab === "profiles" ? payload?.next_cursor : undefined);
  const suggestCursor = surfaceCursors.suggest;
  const notesFailed = typeof surfaceErrors.notes === "string" && surfaceErrors.notes.length > 0;
  const profilesFailed =
    typeof surfaceErrors.profiles === "string" && surfaceErrors.profiles.length > 0;
  const suggestFailed =
    typeof surfaceErrors.suggest === "string" && surfaceErrors.suggest.length > 0;
  const notesAvailable = (payload?.notes?.length ?? 0) > 0;
  const profilesAvailable = hydratedProfiles.length > 0;
  const suggestedProfilesAvailable = hydratedSuggestedProfiles.length > 0;
  return (
    <div className="space-y-8">
      <PageHero
        title="Search"
        subtitle="Explore notes, profiles, and query suggestions with native search surfaces."
        badges={
          canQuery ? (
            <div className="flex flex-wrap gap-2 text-xs">
              <NativeSemanticsBadges semantics={payload} />
              <span className="max-w-full rounded-full border border-zinc-700 px-2 py-1 break-all text-zinc-300">
                Query: {query.q}
              </span>
              {typeof payload?.total === "number" ? (
                <span className="rounded-full border border-zinc-700 px-2 py-1 text-zinc-300">
                  {payload.total.toLocaleString()} results
                </span>
              ) : null}
              {typeof payload?.section_totals?.notes === "number" ? (
                <span className="rounded-full border border-zinc-700 px-2 py-1 text-zinc-300">
                  notes: {payload.section_totals.notes.toLocaleString()}
                </span>
              ) : null}
              {typeof payload?.section_totals?.profiles === "number" ? (
                <span className="rounded-full border border-zinc-700 px-2 py-1 text-zinc-300">
                  profiles: {payload.section_totals.profiles.toLocaleString()}
                </span>
              ) : null}
              {typeof payload?.section_totals?.hashtags === "number" ? (
                <span className="rounded-full border border-zinc-700 px-2 py-1 text-zinc-300">
                  hashtags: {payload.section_totals.hashtags.toLocaleString()}
                </span>
              ) : null}
              {typeof payload?.section_totals?.relays === "number" ? (
                <span className="rounded-full border border-zinc-700 px-2 py-1 text-zinc-300">
                  relays: {payload.section_totals.relays.toLocaleString()}
                </span>
              ) : null}
              {typeof payload?.next_cursor === "string" && payload.next_cursor.length > 0 ? (
                <span className="rounded-full border border-zinc-700 px-2 py-1 text-zinc-300">
                  cursor: available
                </span>
              ) : null}
            </div>
          ) : null
        }
        actions={<SearchForm initialQuery={query.q} className="max-w-3xl" />}
      />

      {!canQuery ? (
        <EmptyState message="Enter a query to start exploring indexed content." />
      ) : errorMessage ? (
        <ErrorPanel message={errorMessage} />
      ) : (
        <div className="space-y-6">
          <nav className="rounded-xl border border-zinc-800 bg-zinc-900/45 p-1">
            <ul className="flex flex-wrap gap-1">
              {SEARCH_TABS.map((tab) => {
                const isActive = tab.key === activeTab;
                return (
                  <li key={tab.key}>
                    <Link
                      href={searchHref({ tab: tab.key, cursor: undefined })}
                      className={`inline-flex items-center rounded-lg px-3 py-1.5 text-sm transition ${
                        isActive
                          ? "bg-zinc-200/90 text-zinc-950"
                          : "text-zinc-300 hover:bg-zinc-800/60 hover:text-zinc-100"
                      }`}
                    >
                      {tab.label}
                      {typeof tabCounts[tab.key] === "number" ? (
                        <span className="ml-2 text-xs opacity-80">
                          {tabCounts[tab.key]?.toLocaleString()}
                        </span>
                      ) : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          {payload?.errors && payload.errors.length > 0 ? (
            <ErrorPanel message={payload.errors.join(" | ")} />
          ) : null}

          {visibleSections.notes ? (
            <SectionCard title="Notes" description="Notes matching the current query.">
              {surfaceErrors.notes ? (
                <ErrorPanel message={`Notes surface unavailable: ${surfaceErrors.notes}`} />
              ) : null}
              {notesAvailable ? (
                <NotesList notes={payload?.notes ?? []} authorsByPubkey={noteAuthorsByPubkey} />
              ) : notesFailed ? (
                <EmptyState message={`Notes are temporarily unavailable for "${query.q}".`} />
              ) : (
                <EmptyState message={`No note hits for "${query.q}".`} />
              )}
              {typeof notesCursor === "string" && notesCursor.length > 0 ? (
                <Link
                  href={searchHref({ tab: "notes", cursor: notesCursor })}
                  className="mt-3 inline-block text-sm text-indigo-300"
                >
                  Continue notes search
                </Link>
              ) : null}
            </SectionCard>
          ) : null}

          {visibleSections.profiles ? (
            <SectionCard title="Profiles" description="Profiles relevant to the current query.">
              {surfaceErrors.profiles ? (
                <ErrorPanel message={`Profiles surface unavailable: ${surfaceErrors.profiles}`} />
              ) : null}
              {profilesAvailable ? (
                <ProfilesList profiles={hydratedProfiles} />
              ) : profilesFailed ? (
                <EmptyState message={`Profiles are temporarily unavailable for "${query.q}".`} />
              ) : (
                <EmptyState message={`No profile hits for "${query.q}".`} />
              )}
              {typeof profilesCursor === "string" && profilesCursor.length > 0 ? (
                <Link
                  href={searchHref({ tab: "profiles", cursor: profilesCursor })}
                  className="mt-3 inline-block text-sm text-indigo-300"
                >
                  Continue profiles search
                </Link>
              ) : null}
            </SectionCard>
          ) : null}

          {visibleSections.suggest ? (
            <SectionCard
              title="Suggested profiles"
              description="Additional profile candidates returned by search suggestions."
            >
              {surfaceErrors.suggest ? (
                <ErrorPanel message={`Suggestions surface unavailable: ${surfaceErrors.suggest}`} />
              ) : null}
              {suggestedProfilesAvailable ? (
                <ProfilesList profiles={hydratedSuggestedProfiles} />
              ) : fallbackSuggestedProfiles.length > 0 ? (
                <div className="space-y-3">
                  <p className="text-xs text-zinc-500">
                    No direct suggestions returned; showing currently trending profiles.
                  </p>
                  <ProfilesList profiles={fallbackSuggestedProfiles} />
                </div>
              ) : suggestFailed ? (
                <EmptyState message={`Suggestions are temporarily unavailable for "${query.q}".`} />
              ) : (
                <EmptyState message={`No profile suggestions returned for "${query.q}".`} />
              )}
              {typeof suggestCursor === "string" && suggestCursor.length > 0 ? (
                <Link
                  href={searchHref({ tab: "all", cursor: suggestCursor })}
                  className="mt-3 inline-block text-sm text-indigo-300"
                >
                  Continue suggestion surface
                </Link>
              ) : null}
            </SectionCard>
          ) : null}

          {visibleSections.hashtags ? (
            <SectionCard title="Hashtags" description="Hashtags inferred from current query scope.">
              {payload?.hashtags && payload.hashtags.length > 0 ? (
                <HashtagsList hashtags={payload.hashtags} searchable />
              ) : fallbackSuggestedHashtags.length > 0 ? (
                <div className="space-y-3">
                  <p className="text-xs text-zinc-500">
                    No query hashtags returned; showing active trending hashtags.
                  </p>
                  <HashtagsList hashtags={fallbackSuggestedHashtags} searchable />
                </div>
              ) : (
                <EmptyState message={`No hashtags returned for "${query.q}".`} />
              )}
            </SectionCard>
          ) : null}

          {visibleSections.relays ? (
            <SectionCard
              title="Relay hints"
              description="Relay entities associated with this query scope."
            >
              {payload?.relays && payload.relays.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {payload.relays.map((relay) => (
                    <Link
                      key={relay}
                      href={`/relays/${encodeURIComponent(relay)}`}
                      className="rounded-full border border-zinc-700 bg-zinc-900/40 px-3 py-1 text-xs break-all text-indigo-300 hover:border-indigo-400/40"
                    >
                      {relay}
                    </Link>
                  ))}
                </div>
              ) : (
                <EmptyState message={`No relay hints returned for "${query.q}".`} />
              )}
            </SectionCard>
          ) : null}
          <DebugDisclosure title="Debug payload" data={payload ?? {}} />
        </div>
      )}
    </div>
  );
}
