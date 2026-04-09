import Link from "next/link";
import type { Metadata } from "next";

import { EmptyState } from "@/components/explorer/empty-state";
import { NativeSemanticsBadges } from "@/components/explorer/native-semantics-badges";
import { PageHero } from "@/components/explorer/page-hero";
import { NotesList, ProfilesList, HashtagsList, DomainsList } from "@/components/data/renderers";
import { SectionCard } from "@/components/ui/section-card";
import { ErrorPanel } from "@/components/ui/status-panels";
import {
  getTrendingDomains,
  getTrendingHashtags,
  getTrendingNotes,
  getTrendingProfiles,
} from "@/lib/api/endpoints";
import { extractNativeApiSemantics } from "@/lib/api/normalize";
import {
  extractEventAuthorPubkeys,
  fetchProfilesByPubkey,
  hydrateProfiles,
} from "@/lib/api/profile-hydration";
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
    href: "/trending/domains",
    title: "Trending domains",
    description: "Domain trends by surfaced notes and discovery activity.",
  },
  {
    href: "/discovery/conversations/hot",
    title: "Hot conversations",
    description: "Conversation-first discovery focused on active thread velocity.",
  },
  {
    href: "/discovery/profiles/rising",
    title: "Rising profiles",
    description: "Emerging profile momentum before top-rank saturation.",
  },
  {
    href: "/relays",
    title: "Relay explorer",
    description: "Inspect active relays, dominance ranking, and relay detail pages.",
  },
  {
    href: "/relays/health",
    title: "Relay health posture",
    description: "Review backend relay health posture without client-side scoring.",
  },
];

export const metadata: Metadata = {
  title: "Trending",
  description:
    "Overview of trending notes, profiles, hashtags, domains, and relay lookup entry points.",
};

export default async function TrendingPage() {
  let errorMessage = "";
  let authorsByPubkey: Record<string, Profile> = {};
  let hydratedProfiles: Profile[] = [];
  const [notesResult, profilesResult, hashtagsResult, domainsResult] = await Promise.allSettled([
    getTrendingNotes("shortTtl"),
    getTrendingProfiles("shortTtl"),
    getTrendingHashtags("shortTtl"),
    getTrendingDomains("shortTtl"),
  ]);

  const notes = notesResult.status === "fulfilled" ? notesResult.value : null;
  const profiles = profilesResult.status === "fulfilled" ? profilesResult.value : null;
  const hashtags = hashtagsResult.status === "fulfilled" ? hashtagsResult.value : null;
  const domains = domainsResult.status === "fulfilled" ? domainsResult.value : null;

  const errors = [notesResult, profilesResult, hashtagsResult, domainsResult]
    .filter((result): result is PromiseRejectedResult => result.status === "rejected")
    .map((result) =>
      result.reason instanceof Error ? result.reason.message : "Trending request failed."
    );
  if (errors.length > 0) {
    errorMessage = errors.join(" | ");
  }

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
  const semantics = extractNativeApiSemantics(notes, profiles, hashtags, domains);

  return (
    <div className="space-y-8">
      <PageHero
        eyebrow="Trending surfaces"
        title="Trending surfaces"
        subtitle="Compare top-ranked notes, profiles, and hashtag movement in one observability entry point."
        badges={
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <NativeSemanticsBadges semantics={semantics} />
            <span className="rounded-full border border-zinc-700 px-2 py-1 text-zinc-300">
              notes: {(notes?.notes?.length ?? 0).toLocaleString()}
            </span>
            <span className="rounded-full border border-zinc-700 px-2 py-1 text-zinc-300">
              profiles: {(profiles?.profiles?.length ?? 0).toLocaleString()}
            </span>
            <span className="rounded-full border border-zinc-700 px-2 py-1 text-zinc-300">
              hashtags: {(hashtags?.hashtags?.length ?? 0).toLocaleString()}
            </span>
            <span className="rounded-full border border-zinc-700 px-2 py-1 text-zinc-300">
              domains: {(domains?.domains?.length ?? 0).toLocaleString()}
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
          {trendingNotesContinuationHref ? (
            <Link
              href={trendingNotesContinuationHref}
              className="mt-2 block text-sm text-indigo-300"
            >
              Continue notes ranking
            </Link>
          ) : null}
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
          {trendingProfilesContinuationHref ? (
            <Link
              href={trendingProfilesContinuationHref}
              className="mt-2 block text-sm text-indigo-300"
            >
              Continue profile ranking
            </Link>
          ) : null}
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
          {trendingHashtagsContinuationHref ? (
            <Link
              href={trendingHashtagsContinuationHref}
              className="mt-2 block text-sm text-indigo-300"
            >
              Continue hashtag ranking
            </Link>
          ) : null}
        </SectionCard>

        <SectionCard
          title="Trending domains snapshot"
          description="Top domains by surfaced note counts."
        >
          {domains?.domains && domains.domains.length > 0 ? (
            <DomainsList domains={domains.domains.slice(0, 10)} ranked searchable />
          ) : (
            <EmptyState
              title="Domains snapshot unavailable"
              message="No ranked domains were returned for the current trend window."
            />
          )}
          <Link href="/trending/domains" className="mt-3 inline-block text-sm text-indigo-300">
            Open full domain ranking
          </Link>
          {trendingDomainsContinuationHref ? (
            <Link
              href={trendingDomainsContinuationHref}
              className="mt-2 block text-sm text-indigo-300"
            >
              Continue domain ranking
            </Link>
          ) : null}
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
