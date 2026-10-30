import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { loadMoreSearchNotes, loadMoreSearchProfiles } from "@/app/search/actions";
import { AboutThisData } from "@/components/explorer/about-this-data";
import { DebugDisclosure } from "@/components/explorer/debug-disclosure";
import { EmptyState } from "@/components/explorer/empty-state";
import { LanguageSelector } from "@/components/explorer/language-selector";
import { profileHref, profileLabel } from "@/components/explorer/utils";
import { WindowSelector } from "@/components/explorer/window-selector";
import { HashtagsList, ProfilesList } from "@/components/data/renderers";
import { LoadMoreList } from "@/components/data/load-more-list";
import { SearchHitList } from "@/components/search/search-hit-list";
import { ProfileCard } from "@/components/explorer/profile-card";
import { SectionCard } from "@/components/ui/section-card";
import { ErrorPanel, SoftRefreshNote } from "@/components/ui/status-panels";
import { TabBar } from "@/components/ui/tabs";
import {
  getSearch,
  type SearchQuery,
  type SearchSort,
  type SearchWindow,
} from "@/lib/api/endpoints";
import { getStaleDataNotice } from "@/lib/api/last-known-good";
import {
  extractEventAuthorPubkeys,
  fetchProfilesByPubkey,
  hydrateProfiles,
} from "@/lib/api/profile-hydration";
import {
  collapseRepeatedAuthors,
  continuationToken,
  displayQuery,
  leadsWithExactProfile,
  searchResultSubtitle,
} from "@/lib/search/display";
import { highlightTermsForQuery } from "@/lib/search/highlight";
import { resolveSearchIntent } from "@/lib/search/intent";
import { KNOWN_LANGUAGE_OPTIONS } from "@/lib/i18n/language-names";
import {
  DEFAULT_SEARCH_SORT,
  DEFAULT_SEARCH_WINDOW,
  SEARCH_SORTS,
  SEARCH_WINDOWS,
  encodeSearchFilters,
} from "@/lib/search-params/search";
import type { Profile, SearchResponse } from "@/lib/types/api";
import { summarizeLoadErrors, toUserFacingErrorMessage } from "@/lib/errors/user-message";

type SearchTab = NonNullable<SearchQuery["tab"]>;

function continuationHref(query: SearchQuery, tab: SearchTab, token: string): string {
  if (token.startsWith("offset:")) {
    const offset = Number.parseInt(token.slice("offset:".length), 10);
    return searchHref(query, { tab, offset: Number.isFinite(offset) ? offset : undefined });
  }
  return searchHref(query, { tab, cursor: token });
}
function searchHref(
  query: SearchQuery,
  overrides: Partial<{
    tab: SearchTab;
    cursor: string | undefined;
    offset: number | undefined;
    correction: "0" | undefined;
    sort: SearchSort;
    window: SearchWindow;
  }>
) {
  const params = new URLSearchParams();
  params.set("q", query.q);
  params.set("tab", overrides.tab ?? query.tab ?? "all");
  if (typeof query.limit === "number") params.set("limit", String(query.limit));
  if (query.lang) params.set("lang", query.lang);
  const window = overrides.window ?? query.window ?? DEFAULT_SEARCH_WINDOW;
  if (window !== DEFAULT_SEARCH_WINDOW) params.set("window", window);
  const sort = overrides.sort ?? query.sort ?? DEFAULT_SEARCH_SORT;
  if (sort !== DEFAULT_SEARCH_SORT) params.set("sort", sort);
  if (overrides.correction === "0" || query.correction === "0") params.set("correction", "0");
  if (typeof overrides.cursor === "string" && overrides.cursor.length > 0) {
    params.set("cursor", overrides.cursor);
  } else if (typeof overrides.offset === "number" && overrides.offset > 0) {
    params.set("offset", String(overrides.offset));
  }
  return `/search?${params.toString()}`;
}

function filterParams(query: SearchQuery): URLSearchParams {
  return new URLSearchParams(searchHref(query, {}).slice("/search?".length));
}

function tabFigures(
  source: SearchResponse["totals_source"],
  apiCount: number | undefined,
  rowCount: number,
  hasMore: boolean
): { count?: number; countLabel?: string } {
  if (source === "api" && typeof apiCount === "number") return { count: apiCount };
  if (hasMore && rowCount > 0) return { countLabel: `${rowCount.toLocaleString()}+` };
  return {};
}

export async function SearchResults({ query }: { query: SearchQuery }) {
  const activeTab: SearchTab = query.tab ?? "all";
  const intent = resolveSearchIntent(query.q);
  const limit = query.limit ?? 20;
  const retryHref = searchHref(query, {});
  let payload: SearchResponse | null = null;
  let errorMessage = "";

  try {
    payload = await getSearch(query, "requestTime");
  } catch (error) {
    errorMessage = toUserFacingErrorMessage(error, "Search failed.");
  }

  if (payload && activeTab === "all" && intent.kind === "hex") {
    const note = payload.direct_note;
    const profile = payload.direct_profile;
    if (note?.id && !profile) redirect(`/notes/${encodeURIComponent(note.id)}`);
    if (profile && !note) {
      const href = profileHref(profile);
      if (href) redirect(href);
    }
  }

  if (errorMessage || !payload) {
    const staleNotice = getStaleDataNotice();
    return (
      <>
        {staleNotice ? <SoftRefreshNote message={staleNotice} /> : null}
        <ErrorPanel message={errorMessage || "Search failed."} retryHref={retryHref} />
      </>
    );
  }

  let profiles = payload.profiles ?? [];
  if (profiles.length > 0) {
    try {
      profiles = await hydrateProfiles(profiles, "shortTtl");
    } catch {
      // keep the rows search already returned
    }
  }
  let suggestions = (payload.profile_suggestions ?? []).slice(0, 5);
  if (suggestions.length > 0) {
    try {
      suggestions = await hydrateProfiles(suggestions, "shortTtl");
    } catch {
      // keep the rows search already returned
    }
  }

  const showBothDirect = Boolean(payload.direct_note && payload.direct_profile);
  const notes = (payload.notes ?? []).filter(
    (note) => !showBothDirect || note.id !== payload.direct_note?.id
  );
  const listedProfiles = profiles.filter(
    (profile) => !showBothDirect || profile.pubkey !== payload.direct_profile?.pubkey
  );
  let authorsByPubkey: Record<string, Profile> = {};
  if (notes.length > 0 || payload.direct_note) {
    try {
      authorsByPubkey = await fetchProfilesByPubkey(
        extractEventAuthorPubkeys([
          ...(payload.direct_note ? [payload.direct_note] : []),
          ...notes,
        ]),
        "shortTtl"
      );
    } catch {
      authorsByPubkey = {};
    }
  }

  const firstPage = activeTab === "all" && !query.cursor && !(query.offset && query.offset > 0);
  const collapsed = firstPage ? collapseRepeatedAuthors(notes) : { notes, extras: [] };
  const terms = highlightTermsForQuery(payload.corrected_query || query.q);
  const notesToken = continuationToken(
    payload.surface_cursors?.notes ?? (activeTab === "notes" ? payload.next_cursor : undefined),
    notes.length,
    limit
  );
  const profilesToken = continuationToken(
    payload.surface_cursors?.profiles ??
      (activeTab === "profiles" ? payload.next_cursor : undefined),
    listedProfiles.length,
    limit
  );
  const notesFailed = Boolean(payload.surface_errors?.notes);
  const profilesFailed = Boolean(payload.surface_errors?.profiles);
  const suggestFailed = Boolean(payload.surface_errors?.suggest);
  const hashtags = payload.hashtags ?? [];
  const relays = payload.relays ?? [];
  const leadWithProfiles = activeTab === "all" && leadsWithExactProfile(query.q, listedProfiles);
  const visible = {
    direct: activeTab === "all" && showBothDirect,
    notes: activeTab === "all" || activeTab === "notes",
    profiles: activeTab === "all" || activeTab === "profiles",
    hashtags: activeTab === "all" || activeTab === "hashtags",
    relays: activeTab === "all" || activeTab === "relays",
    suggestions: activeTab === "all",
  };
  const showNotes = visible.notes && (collapsed.notes.length > 0 || notesFailed);
  const showProfiles = visible.profiles && (listedProfiles.length > 0 || profilesFailed);
  const showHashtags =
    visible.hashtags && (hashtags.length > 0 || (activeTab === "hashtags" && suggestFailed));
  const showRelays =
    visible.relays && (relays.length > 0 || (activeTab === "relays" && suggestFailed));
  const showSuggestions = visible.suggestions && (suggestions.length > 0 || suggestFailed);
  const anySection =
    visible.direct || showNotes || showProfiles || showHashtags || showRelays || showSuggestions;
  const notesFigures = tabFigures(
    payload.totals_source,
    payload.section_totals?.notes,
    notes.length,
    Boolean(notesToken)
  );
  const profilesFigures = tabFigures(
    payload.totals_source,
    payload.section_totals?.profiles,
    listedProfiles.length,
    Boolean(profilesToken)
  );
  const allFigures =
    payload.totals_source === "api" && typeof payload.total === "number"
      ? { count: payload.total }
      : {};
  const hashtagFigures = tabFigures(
    payload.totals_source,
    payload.section_totals?.hashtags,
    hashtags.length,
    false
  );
  const relayFigures = tabFigures(
    payload.totals_source,
    payload.section_totals?.relays,
    relays.length,
    false
  );
  const filters = encodeSearchFilters(query);
  const loadMoreNotes = loadMoreSearchNotes.bind(
    null,
    query.q,
    limit,
    filters,
    payload.corrected_query || query.q
  );
  const loadMoreProfiles = loadMoreSearchProfiles.bind(null, query.q, limit, filters);
  const preservedFilters = filterParams(query);

  const sections: Record<string, ReactNode> = {
    direct: visible.direct ? (
      <SectionCard
        key="direct"
        title="Direct matches"
        description="This identifier matches both a note and a profile."
      >
        <div className="space-y-4">
          {payload.direct_profile ? (
            <ProfileCard profile={payload.direct_profile} searchContext />
          ) : null}
          {payload.direct_note ? (
            <SearchHitList
              notes={[payload.direct_note]}
              authorsByPubkey={authorsByPubkey}
              highlightTerms={terms}
            />
          ) : null}
        </div>
      </SectionCard>
    ) : null,
    notes: showNotes ? (
      <SectionCard key="notes" title="Notes" description="Notes matching the current query.">
        {notesFailed && collapsed.notes.length === 0 ? (
          <ErrorPanel message="Notes results are temporarily unavailable." retryHref={retryHref} />
        ) : (
          <SearchHitList
            notes={collapsed.notes}
            authorsByPubkey={authorsByPubkey}
            highlightTerms={terms}
          />
        )}
        {collapsed.extras.map((extra) => {
          const author = authorsByPubkey[extra.pubkey];
          const href = profileHref(author, extra.pubkey);
          const label = author ? profileLabel(author) : "this author";
          if (!href) return null;
          return (
            <p key={extra.pubkey} className="text-ink-muted mt-3 text-sm">
              <Link href={href} className="text-link">
                {extra.hidden.toLocaleString()} more from {label}
              </Link>
            </p>
          );
        })}
        {notesToken ? (
          <LoadMoreList
            initialCursor={notesToken}
            loadMore={loadMoreNotes}
            label="Show more notes"
          />
        ) : null}
        {notesToken ? (
          <noscript>
            <Link
              href={continuationHref(query, "notes", notesToken)}
              className="text-link mt-3 inline-block text-sm"
            >
              Continue notes search
            </Link>
          </noscript>
        ) : null}
      </SectionCard>
    ) : null,
    profiles: showProfiles ? (
      <SectionCard
        key="profiles"
        title="Profiles"
        description="Profiles relevant to the current query."
      >
        {profilesFailed && listedProfiles.length === 0 ? (
          <ErrorPanel
            message="Profile results are temporarily unavailable."
            retryHref={retryHref}
          />
        ) : (
          <ProfilesList profiles={listedProfiles} searchContext />
        )}
        {profilesToken ? (
          <LoadMoreList
            initialCursor={profilesToken}
            loadMore={loadMoreProfiles}
            label="Show more profiles"
          />
        ) : null}
        {profilesToken ? (
          <noscript>
            <Link
              href={continuationHref(query, "profiles", profilesToken)}
              className="text-link mt-3 inline-block text-sm"
            >
              Continue profiles search
            </Link>
          </noscript>
        ) : null}
      </SectionCard>
    ) : null,
    suggestions: showSuggestions ? (
      <SectionCard
        key="suggestions"
        title="Suggested profiles"
        description="Additional profiles related to this query."
      >
        {suggestFailed && suggestions.length === 0 ? (
          <ErrorPanel message="Suggestions are temporarily unavailable." retryHref={retryHref} />
        ) : (
          <ProfilesList profiles={suggestions} searchContext />
        )}
      </SectionCard>
    ) : null,
    hashtags: showHashtags ? (
      <SectionCard key="hashtags" title="Hashtags" description="Hashtags related to this query.">
        {suggestFailed && hashtags.length === 0 ? (
          <ErrorPanel
            message="Hashtag results are temporarily unavailable."
            retryHref={retryHref}
          />
        ) : (
          <HashtagsList hashtags={hashtags} searchable />
        )}
      </SectionCard>
    ) : null,
    relays: showRelays ? (
      <SectionCard key="relays" title="Relay matches" description="Relays related to this query.">
        {suggestFailed && relays.length === 0 ? (
          <ErrorPanel message="Relay results are temporarily unavailable." retryHref={retryHref} />
        ) : null}
        <div className="flex flex-wrap gap-2">
          {relays.map((relay) => (
            <Link
              key={relay}
              href={`/relays/${encodeURIComponent(relay)}`}
              className="border-edge-strong bg-surface/40 hover:border-accent-soft/40 text-link rounded-full border px-3 py-1 text-xs break-all"
            >
              {relay}
            </Link>
          ))}
        </div>
      </SectionCard>
    ) : null,
  };

  const order = leadWithProfiles
    ? ["direct", "profiles", "notes", "hashtags", "relays", "suggestions"]
    : ["direct", "notes", "profiles", "hashtags", "relays", "suggestions"];
  const partialError = summarizeLoadErrors(payload.errors ?? []);
  const corrected = payload.corrected_query?.trim();
  const showingCorrection = Boolean(
    corrected && corrected.toLowerCase() !== displayQuery(query.q).toLowerCase()
  );
  const staleNotice = getStaleDataNotice();

  return (
    <div className="space-y-6">
      {staleNotice ? <SoftRefreshNote message={staleNotice} /> : null}
      <p className="text-ink-muted text-sm">
        {searchResultSubtitle(corrected || query.q, payload)}
      </p>
      {showingCorrection ? (
        <p className="text-ink-muted text-sm">
          Showing results for {corrected}.{" "}
          <Link href={searchHref(query, { correction: "0" })} className="text-link">
            Search instead for {displayQuery(query.q)}
          </Link>
        </p>
      ) : null}
      <TabBar
        ariaLabel="Search result categories"
        items={[
          {
            key: "all",
            label: "All",
            href: searchHref(query, { tab: "all" }),
            active: activeTab === "all",
            ...allFigures,
          },
          {
            key: "notes",
            label: "Notes",
            href: searchHref(query, { tab: "notes" }),
            active: activeTab === "notes",
            ...notesFigures,
          },
          {
            key: "profiles",
            label: "Profiles",
            href: searchHref(query, { tab: "profiles" }),
            active: activeTab === "profiles",
            ...profilesFigures,
          },
          ...(hashtags.length > 0 || activeTab === "hashtags"
            ? [
                {
                  key: "hashtags",
                  label: "Hashtags",
                  href: searchHref(query, { tab: "hashtags" }),
                  active: activeTab === "hashtags",
                  ...hashtagFigures,
                },
              ]
            : []),
          ...(relays.length > 0 || activeTab === "relays"
            ? [
                {
                  key: "relays",
                  label: "Relays",
                  href: searchHref(query, { tab: "relays" }),
                  active: activeTab === "relays",
                  ...relayFigures,
                },
              ]
            : []),
        ]}
      />
      <div className="nm-meta flex flex-wrap items-center gap-x-3 gap-y-2">
        <WindowSelector
          path="/search"
          searchParams={preservedFilters}
          activeWindow={query.window ?? DEFAULT_SEARCH_WINDOW}
          windows={SEARCH_WINDOWS}
          defaultWindow={DEFAULT_SEARCH_WINDOW}
          ariaLabel="Time range"
          labelFor={(window) => (window === "all" ? "All" : window)}
          // Each query is its own uncached search. Prefetching every range would
          // multiply that work for results the reader may never open.
          prefetch={false}
        />
        <LanguageSelector
          path="/search"
          query={preservedFilters.toString()}
          activeLanguage={query.lang}
          options={KNOWN_LANGUAGE_OPTIONS}
        />
        <div
          className="border-edge-strong bg-surface/40 inline-flex items-center rounded-full border p-0.5"
          role="group"
          aria-label="Result order"
        >
          {SEARCH_SORTS.map((sort) => {
            const active = (query.sort ?? DEFAULT_SEARCH_SORT) === sort;
            return (
              <Link
                key={sort}
                href={searchHref(query, { sort })}
                aria-current={active ? "true" : undefined}
                className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition ${
                  active ? "bg-surface text-ink shadow-sm" : "text-ink-muted hover:text-ink"
                }`}
              >
                {sort === "latest" ? "Latest" : "Relevant"}
              </Link>
            );
          })}
        </div>
      </div>
      {partialError ? <ErrorPanel message={partialError} retryHref={retryHref} /> : null}
      {anySection ? (
        order.map((key) => sections[key])
      ) : partialError ? null : (
        <EmptyState message={`No matches for "${displayQuery(query.q)}".`} />
      )}
      <AboutThisData semantics={payload} />
      <DebugDisclosure title="Debug payload" data={payload} />
    </div>
  );
}
