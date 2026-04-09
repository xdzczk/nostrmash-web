import Link from "next/link";
import type { Metadata } from "next";

import { EmptyState } from "@/components/explorer/empty-state";
import { PageHero } from "@/components/explorer/page-hero";
import { NotesList, ProfilesList, HashtagsList } from "@/components/data/renderers";
import { SectionCard } from "@/components/ui/section-card";
import { ErrorPanel } from "@/components/ui/status-panels";
import {
  getProfilesBatch,
  getTrendingHashtags,
  getTrendingNotes,
  getTrendingProfiles,
} from "@/lib/api/endpoints";
import type { Profile } from "@/lib/types/api";

const sections = [
  {
    href: "/trending/notes",
    title: "Trending notes",
    description: "Most active or ranked notes in current discovery windows.",
  },
  {
    href: "/trending/profiles",
    title: "Trending profiles",
    description: "Profiles surfacing in trending and discovery outputs.",
  },
  {
    href: "/trending/hashtags",
    title: "Trending hashtags",
    description: "Hashtag trends in the currently indexed network slice.",
  },
  {
    href: "/relays/relay.damus.io",
    title: "Relay lookup",
    description: "Inspect a relay host as a first-class explorer entity.",
  },
];

export const metadata: Metadata = {
  title: "Trending",
  description: "Overview of trending notes, profiles, hashtags, and relay lookup entry points.",
};

export default async function TrendingPage() {
  let errorMessage = "";
  let authorsByPubkey: Record<string, Profile> = {};
  let hydratedProfiles: Profile[] = [];
  const [notesResult, profilesResult, hashtagsResult] = await Promise.allSettled([
    getTrendingNotes("shortTtl"),
    getTrendingProfiles("shortTtl"),
    getTrendingHashtags("shortTtl"),
  ]);

  const notes = notesResult.status === "fulfilled" ? notesResult.value : null;
  const profiles = profilesResult.status === "fulfilled" ? profilesResult.value : null;
  const hashtags = hashtagsResult.status === "fulfilled" ? hashtagsResult.value : null;

  const errors = [notesResult, profilesResult, hashtagsResult]
    .filter((result): result is PromiseRejectedResult => result.status === "rejected")
    .map((result) =>
      result.reason instanceof Error ? result.reason.message : "Trending request failed."
    );
  if (errors.length > 0) {
    errorMessage = errors.join(" | ");
  }

  if (notes?.notes?.length) {
    try {
      const profilesForNotes = await getProfilesBatch(
        notes.notes
          .slice(0, 3)
          .map((note) => note.pubkey)
          .filter((pubkey): pubkey is string => typeof pubkey === "string"),
        "shortTtl"
      );
      authorsByPubkey = Object.fromEntries(
        profilesForNotes
          .filter((profile) => typeof profile.pubkey === "string" && profile.pubkey.length > 0)
          .map((profile) => [profile.pubkey.toLowerCase(), profile])
      );
    } catch {
      authorsByPubkey = {};
    }
  }

  if (profiles?.profiles?.length) {
    try {
      const enriched = await getProfilesBatch(
        profiles.profiles
          .slice(0, 5)
          .map((profile) => profile.pubkey)
          .filter((pubkey): pubkey is string => typeof pubkey === "string" && pubkey.length > 0),
        "shortTtl"
      );
      const enrichedByPubkey = new Map(
        enriched
          .filter((profile) => typeof profile.pubkey === "string" && profile.pubkey.length > 0)
          .map((profile) => [profile.pubkey.toLowerCase(), profile] as const)
      );
      hydratedProfiles = profiles.profiles.map((profile) => {
        const key = typeof profile.pubkey === "string" ? profile.pubkey.toLowerCase() : "";
        const enrichedProfile = key ? enrichedByPubkey.get(key) : undefined;
        return { ...profile, ...(enrichedProfile ?? {}) };
      });
    } catch {
      hydratedProfiles = profiles.profiles;
    }
  }

  return (
    <div className="space-y-8">
      <PageHero
        eyebrow="Trending surfaces"
        title="Trending surfaces"
        subtitle="Compare top-ranked notes, profiles, and hashtag movement in one observability entry point."
        badges={
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-full border border-zinc-700 px-2 py-1 text-zinc-300">
              notes: {(notes?.notes?.length ?? 0).toLocaleString()}
            </span>
            <span className="rounded-full border border-zinc-700 px-2 py-1 text-zinc-300">
              profiles: {(profiles?.profiles?.length ?? 0).toLocaleString()}
            </span>
            <span className="rounded-full border border-zinc-700 px-2 py-1 text-zinc-300">
              hashtags: {(hashtags?.hashtags?.length ?? 0).toLocaleString()}
            </span>
          </div>
        }
      />
      {errorMessage ? <ErrorPanel message={errorMessage} /> : null}
      <div className="space-y-6">
        <SectionCard
          title="Trending notes snapshot"
          description="Top ranked notes from the current discovery trend window."
        >
          {notes?.notes && notes.notes.length > 0 ? (
            <NotesList notes={notes.notes.slice(0, 3)} authorsByPubkey={authorsByPubkey} ranked />
          ) : (
            <EmptyState
              title="Notes snapshot unavailable"
              message="No ranked notes were returned for the current trend window."
            />
          )}
          <Link href="/trending/notes" className="mt-3 inline-block text-sm text-indigo-300">
            Open full notes ranking
          </Link>
        </SectionCard>

        <SectionCard
          title="Trending profiles snapshot"
          description="Profiles currently surfacing with the strongest trend signals."
        >
          {hydratedProfiles.length > 0 ? (
            <ProfilesList profiles={hydratedProfiles.slice(0, 5)} ranked />
          ) : (
            <EmptyState
              title="Profiles snapshot unavailable"
              message="No ranked profiles were returned for the current trend window."
            />
          )}
          <Link href="/trending/profiles" className="mt-3 inline-block text-sm text-indigo-300">
            Open full profile ranking
          </Link>
        </SectionCard>

        <SectionCard
          title="Trending hashtags snapshot"
          description="Top hashtags by current mention counts."
        >
          {hashtags?.hashtags && hashtags.hashtags.length > 0 ? (
            <HashtagsList hashtags={hashtags.hashtags.slice(0, 10)} ranked searchable />
          ) : (
            <EmptyState
              title="Hashtags snapshot unavailable"
              message="No ranked hashtags were returned for the current trend window."
            />
          )}
          <Link href="/trending/hashtags" className="mt-3 inline-block text-sm text-indigo-300">
            Open full hashtag ranking
          </Link>
        </SectionCard>

        <div className="grid gap-4 sm:grid-cols-2">
          {sections.map((section) => (
            <SectionCard key={section.href} title={section.title} description={section.description}>
              <Link
                href={section.href}
                className="inline-block rounded-md border border-zinc-700 bg-zinc-900/40 px-3 py-2 text-sm text-indigo-300 hover:border-indigo-400/40 hover:text-indigo-200"
              >
                Open explorer
              </Link>
            </SectionCard>
          ))}
        </div>
      </div>
    </div>
  );
}
