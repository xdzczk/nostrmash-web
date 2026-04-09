import { SearchForm } from "@/components/search/search-form";
import { NotesList, ProfilesList, HashtagsList } from "@/components/data/renderers";
import { SectionCard } from "@/components/ui/section-card";
import { EmptyPanel, ErrorPanel, JsonPanel } from "@/components/ui/status-panels";
import { getSearch } from "@/lib/api/endpoints";
import { parseSearchQuery } from "@/lib/search-params/search";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function SearchPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const query = parseSearchQuery(await searchParams);
  const canQuery = query.q.length > 0;
  let errorMessage = "";
  let payload: Awaited<ReturnType<typeof getSearch>> | null = null;

  if (canQuery) {
    try {
      payload = await getSearch(query, "requestTime");
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : "Search failed.";
    }
  }

  return (
    <div className="space-y-6">
      <section className="space-y-3 rounded-lg border border-zinc-800 bg-zinc-900/60 p-6">
        <h1 className="text-2xl font-semibold tracking-tight">Search</h1>
        <p className="text-sm text-zinc-300">
          Query notes, profiles, and hashtags from the NostrMash index.
        </p>
        <SearchForm initialQuery={query.q} />
      </section>

      {!canQuery ? (
        <EmptyPanel message="Enter a query to start exploring indexed content." />
      ) : errorMessage ? (
        <ErrorPanel message={errorMessage} />
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <SectionCard title="Notes" description="Notes matching the current query.">
            {payload?.notes && payload.notes.length > 0 ? (
              <NotesList notes={payload.notes} />
            ) : (
              <EmptyPanel message="No note hits for this query." />
            )}
          </SectionCard>
          <SectionCard title="Profiles" description="Profiles relevant to the current query.">
            {payload?.profiles && payload.profiles.length > 0 ? (
              <ProfilesList profiles={payload.profiles} />
            ) : (
              <EmptyPanel message="No profile hits for this query." />
            )}
          </SectionCard>
          <SectionCard
            title="Hashtags"
            description="Hashtags inferred from current query scope."
          >
            {payload?.hashtags && payload.hashtags.length > 0 ? (
              <HashtagsList hashtags={payload.hashtags} />
            ) : (
              <EmptyPanel message="No hashtags returned." />
            )}
          </SectionCard>
          <SectionCard title="Raw response" description="Useful for contract debugging.">
            <JsonPanel data={payload ?? {}} />
          </SectionCard>
        </div>
      )}
    </div>
  );
}
