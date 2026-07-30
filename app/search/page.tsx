import type { Metadata } from "next";
import Link from "next/link";

import { DebugDisclosure } from "@/components/explorer/debug-disclosure";
import { EmptyState } from "@/components/explorer/empty-state";
import { AboutThisData } from "@/components/explorer/about-this-data";
import { PageHero } from "@/components/explorer/page-hero";
import { SearchForm } from "@/components/search/search-form";
import { NotesList, ProfilesList, HashtagsList } from "@/components/data/renderers";
import { SectionCard } from "@/components/ui/section-card";
import { ErrorPanel, SoftRefreshNote } from "@/components/ui/status-panels";
import { Pill } from "@/components/ui/pill";
import { TabBar } from "@/components/ui/tabs";
import { getSearch, getTrendingHashtags, getTrendingProfiles } from "@/lib/api/endpoints";
import { getStaleDataNotice } from "@/lib/api/http";
import {
  extractEventAuthorPubkeys,
  fetchProfilesByPubkey,
  hydrateProfiles,
} from "@/lib/api/profile-hydration";
import { parseSearchQuery } from "@/lib/search-params/search";
import type { Profile } from "@/lib/types/api";
import { summarizeLoadErrors, toUserFacingErrorMessage } from "@/lib/errors/user-message";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export const metadata: Metadata = {
  title: "Search",
  description: "Search notes, profiles, hashtags, and relays across NostrMash.",
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
      payload = await getSearch(query, "shortTtl");
      suggestedProfiles = payload.profile_suggestions ?? [];
      hydratedProfiles = payload.profiles ?? [];
      hydratedSuggestedProfiles = suggestedProfiles;
    } catch (error) {
      errorMessage = toUserFacingErrorMessage(error, "Search failed.");
    }
  }

  if (payload?.notes?.length) {
    try {
      noteAuthorsByPubkey = await fetchProfilesByPubkey(
        extractEventAuthorPubkeys(payload.notes ?? []),
        "shortTtl"
      );
    } catch {
      noteAuthorsByPubkey = {};
    }
  }

  if (hydratedProfiles.length > 0) {
    try {
      hydratedProfiles = await hydrateProfiles(hydratedProfiles, "shortTtl");
    } catch {
      // keep raw search profile rows
    }
  }

  if (hydratedSuggestedProfiles.length > 0) {
    try {
      hydratedSuggestedProfiles = await hydrateProfiles(hydratedSuggestedProfiles, "shortTtl");
    } catch {
      // keep raw suggestion rows
    }
  }

  const staleNotice = getStaleDataNotice();

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
  const surfaceOffsets = payload?.surface_offsets ?? {};
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
  const searchHref = (overrides: Partial<{ tab: SearchTab; offset: number | undefined }>) => {
    const params = new URLSearchParams();
    params.set("q", query.q);
    params.set("tab", overrides.tab ?? activeTab);
    if (typeof query.limit === "number") {
      params.set("limit", String(query.limit));
    }
    const offsetValue = overrides.offset;
    if (typeof offsetValue === "number" && offsetValue > 0) {
      params.set("offset", String(offsetValue));
    }
    return `/search?${params.toString()}`;
  };
  const notesNextOffset =
    surfaceOffsets.notes ?? (activeTab === "notes" ? payload?.next_offset : undefined);
  const profilesNextOffset =
    surfaceOffsets.profiles ?? (activeTab === "profiles" ? payload?.next_offset : undefined);
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
        eyebrow="Global search"
        title={canQuery ? `Results for “${query.q}”` : "Find any public signal."}
        subtitle="Search notes, people, topics, links, event identifiers, and relays from one focused index."
        badges={
          canQuery ? (
            <div className="flex flex-wrap gap-2 text-xs">
              <Pill tone="neutral" className="max-w-full break-all">
                Query: {query.q}
              </Pill>
              {typeof payload?.total === "number" ? (
                <Pill tone="neutral">{payload.total.toLocaleString()} results</Pill>
              ) : null}
              {typeof payload?.section_totals?.notes === "number" ? (
                <Pill tone="neutral">notes: {payload.section_totals.notes.toLocaleString()}</Pill>
              ) : null}
              {typeof payload?.section_totals?.profiles === "number" ? (
                <Pill tone="neutral">
                  profiles: {payload.section_totals.profiles.toLocaleString()}
                </Pill>
              ) : null}
              {typeof payload?.section_totals?.hashtags === "number" ? (
                <Pill tone="neutral">
                  hashtags: {payload.section_totals.hashtags.toLocaleString()}
                </Pill>
              ) : null}
              {typeof payload?.section_totals?.relays === "number" ? (
                <Pill tone="neutral">relays: {payload.section_totals.relays.toLocaleString()}</Pill>
              ) : null}
              {typeof payload?.next_cursor === "string" && payload.next_cursor.length > 0 ? (
                <Pill tone="neutral">cursor: available</Pill>
              ) : null}
              {typeof query.offset === "number" && query.offset > 0 ? (
                <Pill tone="neutral">offset: {query.offset.toLocaleString()}</Pill>
              ) : null}
            </div>
          ) : null
        }
        actions={<SearchForm initialQuery={query.q} className="max-w-3xl" />}
      />

      {staleNotice ? <SoftRefreshNote message={staleNotice} /> : null}

      {!canQuery ? (
        <SectionCard
          title="Start with discovery"
          description="Search above, or continue with the strongest signals already moving across Nostr."
        >
          <nav aria-label="Search alternatives" className="grid gap-0 sm:grid-cols-3">
            {[
              {
                href: "/",
                label: "Discover overview",
                description: "The strongest signals across notes, people, topics, and links.",
              },
              {
                href: "/discovery/conversations/hot",
                label: "Active conversations",
                description: "Threads drawing meaningful attention now.",
              },
              {
                href: "/relays",
                label: "Network intelligence",
                description: "Relay concentration, reach, and health.",
              },
            ].map((entry) => (
              <Link
                key={entry.href}
                href={entry.href}
                className="border-edge/65 group border-t py-5 sm:border-l sm:px-5 sm:first:border-l-0"
              >
                <span className="text-ink group-hover:text-link text-sm font-medium">
                  {entry.label}
                </span>
                <span className="text-ink-muted mt-2 block text-sm leading-6">
                  {entry.description}
                </span>
              </Link>
            ))}
          </nav>
        </SectionCard>
      ) : errorMessage ? (
        <ErrorPanel message={errorMessage} />
      ) : (
        <div className="space-y-6">
          <TabBar
            ariaLabel="Search result categories"
            items={SEARCH_TABS.map((tab) => ({
              key: tab.key,
              label: tab.label,
              href: searchHref({ tab: tab.key, offset: undefined }),
              active: tab.key === activeTab,
              count: tabCounts[tab.key],
            }))}
          />

          {payload?.errors && payload.errors.length > 0 ? (
            <ErrorPanel
              message={
                summarizeLoadErrors(payload.errors) ??
                "Some search results are temporarily unavailable."
              }
            />
          ) : null}

          {visibleSections.notes ? (
            <SectionCard title="Notes" description="Notes matching the current query.">
              {notesFailed && !notesAvailable ? (
                <ErrorPanel message="Notes results are temporarily unavailable." />
              ) : null}
              {notesAvailable ? (
                <NotesList notes={payload?.notes ?? []} authorsByPubkey={noteAuthorsByPubkey} />
              ) : notesFailed ? (
                <EmptyState message={`Notes are temporarily unavailable for "${query.q}".`} />
              ) : (
                <EmptyState message={`No note hits for "${query.q}".`} />
              )}
              {typeof notesNextOffset === "number" ? (
                <Link
                  href={searchHref({ tab: "notes", offset: notesNextOffset })}
                  className="text-link mt-3 inline-block text-sm"
                >
                  Continue notes search
                </Link>
              ) : null}
            </SectionCard>
          ) : null}

          {visibleSections.profiles ? (
            <SectionCard title="Profiles" description="Profiles relevant to the current query.">
              {profilesFailed && !profilesAvailable ? (
                <ErrorPanel message="Profile results are temporarily unavailable." />
              ) : null}
              {profilesAvailable ? (
                <ProfilesList profiles={hydratedProfiles} />
              ) : profilesFailed ? (
                <EmptyState message={`Profiles are temporarily unavailable for "${query.q}".`} />
              ) : (
                <EmptyState message={`No profile hits for "${query.q}".`} />
              )}
              {typeof profilesNextOffset === "number" ? (
                <Link
                  href={searchHref({ tab: "profiles", offset: profilesNextOffset })}
                  className="text-link mt-3 inline-block text-sm"
                >
                  Continue profiles search
                </Link>
              ) : null}
            </SectionCard>
          ) : null}

          {visibleSections.suggest ? (
            <SectionCard
              title="Suggested profiles"
              description="Additional profiles related to this query."
            >
              {suggestFailed && !suggestedProfilesAvailable ? (
                <ErrorPanel message="Suggestions are temporarily unavailable." />
              ) : null}
              {suggestedProfilesAvailable ? (
                <ProfilesList profiles={hydratedSuggestedProfiles} />
              ) : fallbackSuggestedProfiles.length > 0 ? (
                <div className="space-y-3">
                  <p className="text-ink-faint text-xs">
                    No direct suggestions returned; showing trending profiles instead.
                  </p>
                  <ProfilesList profiles={fallbackSuggestedProfiles} />
                </div>
              ) : suggestFailed ? (
                <EmptyState message={`Suggestions are temporarily unavailable for "${query.q}".`} />
              ) : (
                <EmptyState message={`No profile suggestions returned for "${query.q}".`} />
              )}
            </SectionCard>
          ) : null}

          {visibleSections.hashtags ? (
            <SectionCard title="Hashtags" description="Hashtags related to this query.">
              {payload?.hashtags && payload.hashtags.length > 0 ? (
                <HashtagsList hashtags={payload.hashtags} searchable />
              ) : fallbackSuggestedHashtags.length > 0 ? (
                <div className="space-y-3">
                  <p className="text-ink-faint text-xs">
                    No hashtags matched this query; showing trending hashtags instead.
                  </p>
                  <HashtagsList hashtags={fallbackSuggestedHashtags} searchable />
                </div>
              ) : (
                <EmptyState message={`No hashtags returned for "${query.q}".`} />
              )}
            </SectionCard>
          ) : null}

          {visibleSections.relays ? (
            <SectionCard title="Relay matches" description="Relays related to this query.">
              {payload?.relays && payload.relays.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {payload.relays.map((relay) => (
                    <Link
                      key={relay}
                      href={`/relays/${encodeURIComponent(relay)}`}
                      className="border-edge-strong bg-surface/40 hover:border-accent-soft/40 text-link rounded-full border px-3 py-1 text-xs break-all"
                    >
                      {relay}
                    </Link>
                  ))}
                </div>
              ) : (
                <EmptyState message={`No relay matches returned for "${query.q}".`} />
              )}
            </SectionCard>
          ) : null}
          <AboutThisData semantics={payload} />
          <DebugDisclosure title="Debug payload" data={payload ?? {}} />
        </div>
      )}
    </div>
  );
}
