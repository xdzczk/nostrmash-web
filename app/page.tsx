import Link from "next/link";

import { SearchForm } from "@/components/search/search-form";
import { NotesList, ProfilesList, HashtagsList } from "@/components/data/renderers";
import { SectionCard } from "@/components/ui/section-card";
import { ErrorPanel, EmptyPanel } from "@/components/ui/status-panels";
import { getDiscoveryHome } from "@/lib/api/endpoints";

export default async function HomePage() {
  let errorMessage = "";
  let payload: Awaited<ReturnType<typeof getDiscoveryHome>> | null = null;
  try {
    payload = await getDiscoveryHome("shortTtl");
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : "Failed to load discovery home.";
  }

  return (
    <div className="space-y-6">
      <section className="space-y-3 rounded-lg border border-zinc-800 bg-zinc-900/60 p-6">
        <h1 className="text-2xl font-semibold tracking-tight">NostrMash network observatory</h1>
        <p className="max-w-3xl text-sm text-zinc-300">
          Search notes and profiles, inspect trending activity, and explore current network-level
          signals from the indexed Nostr graph.
        </p>
        <SearchForm />
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard
          title="Trending notes"
          description="Freshly ranked content from the discovery home payload."
        >
          {errorMessage ? (
            <ErrorPanel message={errorMessage} />
          ) : payload?.notes && payload.notes.length > 0 ? (
            <NotesList notes={payload.notes.slice(0, 5)} />
          ) : (
            <EmptyPanel message="No notes available for this time window." />
          )}
          <Link href="/trending/notes" className="mt-3 inline-block text-sm text-indigo-300">
            View all trending notes
          </Link>
        </SectionCard>

        <SectionCard
          title="Trending profiles"
          description="Authors currently surfacing in public discovery."
        >
          {errorMessage ? (
            <ErrorPanel message={errorMessage} />
          ) : payload?.profiles && payload.profiles.length > 0 ? (
            <ProfilesList profiles={payload.profiles.slice(0, 5)} />
          ) : (
            <EmptyPanel message="No profile rankings available right now." />
          )}
          <Link href="/trending/profiles" className="mt-3 inline-block text-sm text-indigo-300">
            View all trending profiles
          </Link>
        </SectionCard>
      </div>

      <SectionCard title="Trending hashtags" description="Hashtag activity in the current index.">
        {errorMessage ? (
          <ErrorPanel message={errorMessage} />
        ) : payload?.hashtags && payload.hashtags.length > 0 ? (
          <HashtagsList hashtags={payload.hashtags.slice(0, 12)} />
        ) : (
          <EmptyPanel message="No hashtag activity returned by the API." />
        )}
        <Link href="/trending/hashtags" className="mt-3 inline-block text-sm text-indigo-300">
          View all trending hashtags
        </Link>
      </SectionCard>
    </div>
  );
}
