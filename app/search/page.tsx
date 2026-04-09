import type { Metadata } from "next";

import { DebugDisclosure } from "@/components/explorer/debug-disclosure";
import { EmptyState } from "@/components/explorer/empty-state";
import { PageHero } from "@/components/explorer/page-hero";
import { SearchForm } from "@/components/search/search-form";
import { NotesList, ProfilesList, HashtagsList } from "@/components/data/renderers";
import { SectionCard } from "@/components/ui/section-card";
import { ErrorPanel } from "@/components/ui/status-panels";
import { getProfilesBatch, getSearch } from "@/lib/api/endpoints";
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

  if (canQuery) {
    try {
      payload = await getSearch(query, "requestTime");
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
          .map((profile) => [profile.pubkey, profile])
      );
    } catch {
      noteAuthorsByPubkey = {};
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
            {payload?.profiles && payload.profiles.length > 0 ? (
              <ProfilesList profiles={payload.profiles} />
            ) : (
              <EmptyState message={`No profile hits for "${query.q}".`} />
            )}
          </SectionCard>
          <SectionCard title="Hashtags" description="Hashtags inferred from current query scope.">
            {payload?.hashtags && payload.hashtags.length > 0 ? (
              <HashtagsList hashtags={payload.hashtags} searchable />
            ) : (
              <EmptyState message={`No hashtags returned for "${query.q}".`} />
            )}
          </SectionCard>
          <DebugDisclosure title="Debug payload" data={payload ?? {}} />
        </div>
      )}
    </div>
  );
}
