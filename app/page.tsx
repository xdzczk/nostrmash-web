import Link from "next/link";
import type { Metadata } from "next";

import { EmptyState } from "@/components/explorer/empty-state";
import { PageHero } from "@/components/explorer/page-hero";
import { StatCard } from "@/components/explorer/stat-card";
import { extractPrimitiveStats, isRecord } from "@/components/explorer/utils";
import { SearchForm } from "@/components/search/search-form";
import { NotesList, ProfilesList, HashtagsList } from "@/components/data/renderers";
import { SectionCard } from "@/components/ui/section-card";
import { ErrorPanel } from "@/components/ui/status-panels";
import { getDiscoveryHome } from "@/lib/api/endpoints";

export const metadata: Metadata = {
  title: "NostrMash Explorer",
  description:
    "Explore notes, profiles, hashtags, and network pulse metrics from the NostrMash index.",
};

export default async function HomePage() {
  let errorMessage = "";
  let payload: Awaited<ReturnType<typeof getDiscoveryHome>> | null = null;
  try {
    payload = await getDiscoveryHome("shortTtl");
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : "Failed to load discovery home.";
  }

  const pulseStats = extractPrimitiveStats(isRecord(payload?.stats) ? payload.stats : {}, []).slice(
    0,
    4
  );

  return (
    <div className="space-y-8">
      <PageHero
        title="NostrMash network observatory"
        subtitle="Public explorer and analytics surface for indexed Nostr activity."
        actions={<SearchForm className="max-w-3xl" />}
      />

      {pulseStats.length > 0 ? (
        <section className="space-y-3">
          <p className="text-xs tracking-wide text-zinc-500 uppercase">Network pulse</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {pulseStats.map((stat) => (
              <StatCard key={stat.label} label={stat.label} value={stat.value} />
            ))}
          </div>
        </section>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard
          title="Trending now"
          description="Current top notes from the discovery stream."
        >
          {errorMessage ? (
            <ErrorPanel message={errorMessage} />
          ) : payload?.notes && payload.notes.length > 0 ? (
            <NotesList notes={payload.notes.slice(0, 5)} />
          ) : (
            <EmptyState message="No notes available for this time window." />
          )}
          <Link href="/trending/notes" className="mt-3 inline-block text-sm text-indigo-300">
            View all trending notes
          </Link>
        </SectionCard>

        <SectionCard
          title="Profiles in motion"
          description="Authors currently surfacing in discovery outputs."
        >
          {errorMessage ? (
            <ErrorPanel message={errorMessage} />
          ) : payload?.profiles && payload.profiles.length > 0 ? (
            <ProfilesList profiles={payload.profiles.slice(0, 5)} />
          ) : (
            <EmptyState message="No profile rankings available right now." />
          )}
          <Link href="/trending/profiles" className="mt-3 inline-block text-sm text-indigo-300">
            View all trending profiles
          </Link>
        </SectionCard>
      </div>

      <SectionCard
        title="Hashtag pulse"
        description="Hashtags surfacing in the current index window."
      >
        {errorMessage ? (
          <ErrorPanel message={errorMessage} />
        ) : payload?.hashtags && payload.hashtags.length > 0 ? (
          <HashtagsList hashtags={payload.hashtags.slice(0, 12)} searchable />
        ) : (
          <EmptyState message="No hashtag activity returned by the API." />
        )}
        <Link href="/trending/hashtags" className="mt-3 inline-block text-sm text-indigo-300">
          View all trending hashtags
        </Link>
      </SectionCard>

      <SectionCard title="Quick entry points" description="Jump directly into explorer surfaces.">
        <div className="grid gap-2 text-sm sm:grid-cols-2">
          <Link
            href="/trending"
            className="rounded-md border border-zinc-800 bg-zinc-900/40 p-3 text-zinc-200 hover:border-indigo-400/40"
          >
            Browse trending surfaces
          </Link>
          <Link
            href="/stats"
            className="rounded-md border border-zinc-800 bg-zinc-900/40 p-3 text-zinc-200 hover:border-indigo-400/40"
          >
            Inspect network stats
          </Link>
          <Link
            href="/search"
            className="rounded-md border border-zinc-800 bg-zinc-900/40 p-3 text-zinc-200 hover:border-indigo-400/40"
          >
            Search notes and profiles
          </Link>
          <Link
            href="/relays/relay.damus.io"
            className="rounded-md border border-zinc-800 bg-zinc-900/40 p-3 text-zinc-200 hover:border-indigo-400/40"
          >
            Relay lookup
          </Link>
        </div>
      </SectionCard>
    </div>
  );
}
