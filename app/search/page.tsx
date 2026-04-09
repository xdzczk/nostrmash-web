import type { Metadata } from "next";
import Link from "next/link";

import { DebugDisclosure } from "@/components/explorer/debug-disclosure";
import { EmptyState } from "@/components/explorer/empty-state";
import { PageHero } from "@/components/explorer/page-hero";
import { SearchForm } from "@/components/search/search-form";
import { NotesList, ProfilesList, HashtagsList } from "@/components/data/renderers";
import { SectionCard } from "@/components/ui/section-card";
import { ErrorPanel } from "@/components/ui/status-panels";
import {
  getProfilesBatch,
  getSearch,
  getTrendingHashtags,
  getTrendingProfiles,
} from "@/lib/api/endpoints";
import { parseSearchQuery } from "@/lib/search-params/search";
import type { Profile } from "@/lib/types/api";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export const metadata: Metadata = {
  title: "Search",
  description: "Search notes, profiles, and hashtag activity across NostrMash indexed data.",
};

export default async function SearchPage({ searchParams }: { searchParams: SearchParams }) {
  const query = parseSearchQuery(await searchParams);
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
      const noteAuthors = await getProfilesBatch(
        (payload.notes ?? [])
          .map((note) => note.pubkey)
          .filter((pubkey): pubkey is string => typeof pubkey === "string"),
        "requestTime"
      );
      noteAuthorsByPubkey = Object.fromEntries(
        noteAuthors
          .filter((profile) => typeof profile.pubkey === "string" && profile.pubkey.length > 0)
          .map((profile) => [profile.pubkey.toLowerCase(), profile])
      );
    } catch {
      noteAuthorsByPubkey = {};
    }
  }

  if (
    canQuery &&
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

  return (
    <div className="space-y-8">
      <PageHero
        title="Search"
        subtitle="Query notes, profiles, and hashtags from the NostrMash index."
        badges={
          canQuery ? (
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="rounded-full border border-zinc-700 px-2 py-1 text-zinc-300">
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
          {payload?.errors && payload.errors.length > 0 ? (
            <ErrorPanel message={payload.errors.join(" | ")} />
          ) : null}
          <SectionCard title="Notes" description="Notes matching the current query.">
            {payload?.notes && payload.notes.length > 0 ? (
              <NotesList notes={payload.notes} authorsByPubkey={noteAuthorsByPubkey} />
            ) : (
              <EmptyState message={`No note hits for "${query.q}".`} />
            )}
          </SectionCard>
          <SectionCard title="Profiles" description="Profiles relevant to the current query.">
            {hydratedProfiles.length > 0 ? (
              <ProfilesList profiles={hydratedProfiles} />
            ) : (
              <EmptyState message={`No profile hits for "${query.q}".`} />
            )}
          </SectionCard>
          <SectionCard
            title="Suggested profiles"
            description="Additional profile candidates returned by search suggestions."
          >
            {hydratedSuggestedProfiles.length > 0 ? (
              <ProfilesList profiles={hydratedSuggestedProfiles} />
            ) : fallbackSuggestedProfiles.length > 0 ? (
              <div className="space-y-3">
                <p className="text-xs text-zinc-500">
                  No direct suggestions returned; showing currently trending profiles.
                </p>
                <ProfilesList profiles={fallbackSuggestedProfiles} />
              </div>
            ) : (
              <EmptyState message={`No profile suggestions returned for "${query.q}".`} />
            )}
          </SectionCard>
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
                    className="rounded-full border border-zinc-700 bg-zinc-900/40 px-3 py-1 text-xs text-indigo-300 hover:border-indigo-400/40"
                  >
                    {relay}
                  </Link>
                ))}
              </div>
            ) : (
              <EmptyState message={`No relay hints returned for "${query.q}".`} />
            )}
          </SectionCard>
          <DebugDisclosure title="Debug payload" data={payload ?? {}} />
        </div>
      )}
    </div>
  );
}
