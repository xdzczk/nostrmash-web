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
    description: "Domains gaining traction from currently ranked notes.",
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
    title: "Relay health",
    description: "Review relay availability and backend health signals.",
  },
];

export const metadata: Metadata = {
  title: "Trending",
  description:
    "Explore what is trending now across notes, profiles, hashtags, domains, and relays.",
};

export default async function TrendingPage() {
  const normalizeUnixSeconds = (value: unknown): number | null => {
    if (typeof value !== "number" || !Number.isFinite(value)) return null;
    if (value > 1_000_000_000_000) return Math.floor(value / 1000);
    if (value > 1_000_000_000) return Math.floor(value);
    return null;
  };
  const formatFreshness = (value: unknown): string | null => {
    const unixSeconds = normalizeUnixSeconds(value);
    if (!unixSeconds) return null;
    const observedAt = new Date(unixSeconds * 1000);
    if (Number.isNaN(observedAt.getTime())) return null;
    return `Updated ${observedAt.toLocaleString()}`;
  };
  const trendWindowLabel = "24h trend window";
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
  const notesFreshness = formatFreshness(notes?.notes?.[0]?.created_at) ?? "Updated recently";
  const profileActivityCandidates = hydratedProfiles
    .map((profile) =>
      [
        profile.recent_activity_at,
        profile.last_activity_at,
        profile.updated_at,
        profile.created_at,
      ].map(normalizeUnixSeconds)
    )
    .flat()
    .filter((value): value is number => typeof value === "number");
  const latestProfileActivity =
    profileActivityCandidates.length > 0 ? Math.max(...profileActivityCandidates) : null;
  const profilesFreshness =
    formatFreshness(latestProfileActivity) ??
    formatFreshness(notes?.notes?.[0]?.created_at) ??
    "Updated recently";
  const hashtagsFreshness = formatFreshness(notes?.notes?.[0]?.created_at) ?? "Updated recently";
  const domainsFreshness = formatFreshness(notes?.notes?.[0]?.created_at) ?? "Updated recently";
  const semantics = extractNativeApiSemantics(notes, profiles, hashtags, domains);

  return (
    <div className="space-y-8">
      <PageHero
        eyebrow="Trending now"
        title="Trending now"
        subtitle="Compare top-ranked notes, profiles, hashtags, and domains in one explorer view."
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
          title="Trending now"
          description="Top ranked notes in the current trend window with direct thread and relay pivots."
        >
          <div className="mb-3 flex flex-wrap items-center gap-2 text-[11px] text-zinc-300 sm:mb-4">
            <span className="rounded-full border border-zinc-700/80 bg-zinc-950/40 px-2.5 py-1">
              {trendWindowLabel}
            </span>
            <span className="rounded-full border border-zinc-700/80 bg-zinc-950/40 px-2.5 py-1">
              {notesFreshness}
            </span>
            <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-emerald-300">
              Live rank movers
            </span>
          </div>
          {notes?.notes && notes.notes.length > 0 ? (
            <NotesList
              notes={notes.notes.slice(0, 3)}
              authorsByPubkey={authorsByPubkey}
              ranked
              discoverySignals
            />
          ) : (
            <EmptyState
              title="Notes snapshot unavailable"
              message="No ranked notes were returned for the current trend window."
            />
          )}
          <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-indigo-300">
            <Link href="/trending/notes" className="hover:text-indigo-200">
              Open trend view
            </Link>
            <span className="text-zinc-600">•</span>
            <Link href="/trending/notes" className="hover:text-indigo-200">
              Compare note ranks
            </Link>
          </div>
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
          title="Profiles in motion"
          description="Profiles gaining visibility across recent activity with direct authored-note pivots."
        >
          <div className="mb-3 flex flex-wrap items-center gap-2 text-[11px] text-zinc-300 sm:mb-4">
            <span className="rounded-full border border-zinc-700/80 bg-zinc-950/40 px-2.5 py-1">
              {trendWindowLabel}
            </span>
            <span className="rounded-full border border-zinc-700/80 bg-zinc-950/40 px-2.5 py-1">
              {profilesFreshness}
            </span>
            <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-emerald-300">
              Visibility movers
            </span>
          </div>
          {hydratedProfiles.length > 0 ? (
            <ProfilesList profiles={hydratedProfiles.slice(0, 5)} ranked discoverySignals />
          ) : (
            <EmptyState
              title="Profiles snapshot unavailable"
              message="No ranked profiles were returned for the current trend window."
            />
          )}
          <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-indigo-300">
            <Link href="/trending/profiles" className="hover:text-indigo-200">
              Open trend view
            </Link>
            <span className="text-zinc-600">•</span>
            <Link href="/discovery/profiles/rising" className="hover:text-indigo-200">
              Inspect rising profiles
            </Link>
          </div>
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
          title="Hashtags accelerating"
          description="Hashtags rising faster than baseline in the active discovery window."
        >
          <div className="mb-3 flex flex-wrap items-center gap-2 text-[11px] text-zinc-300 sm:mb-4">
            <span className="rounded-full border border-zinc-700/80 bg-zinc-950/40 px-2.5 py-1">
              {trendWindowLabel}
            </span>
            <span className="rounded-full border border-zinc-700/80 bg-zinc-950/40 px-2.5 py-1">
              {hashtagsFreshness}
            </span>
            <span className="rounded-full border border-indigo-500/30 bg-indigo-500/10 px-2.5 py-1 text-indigo-300">
              Mention-lift rank
            </span>
          </div>
          {hashtags?.hashtags && hashtags.hashtags.length > 0 ? (
            <HashtagsList hashtags={hashtags.hashtags.slice(0, 10)} ranked searchable />
          ) : (
            <EmptyState
              title="Hashtags snapshot unavailable"
              message="No ranked hashtags were returned for the current trend window."
            />
          )}
          <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-indigo-300">
            <Link href="/trending/hashtags" className="hover:text-indigo-200">
              Open trend view
            </Link>
            <span className="text-zinc-600">•</span>
            <Link href="/search?tab=all" className="hover:text-indigo-200">
              Search related notes
            </Link>
          </div>
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
          title="Links gaining traction"
          description="Domains ranking higher in current note discovery with cross-note spread signals."
        >
          <div className="mb-3 flex flex-wrap items-center gap-2 text-[11px] text-zinc-300 sm:mb-4">
            <span className="rounded-full border border-zinc-700/80 bg-zinc-950/40 px-2.5 py-1">
              {trendWindowLabel}
            </span>
            <span className="rounded-full border border-zinc-700/80 bg-zinc-950/40 px-2.5 py-1">
              {domainsFreshness}
            </span>
            <span className="rounded-full border border-indigo-500/30 bg-indigo-500/10 px-2.5 py-1 text-indigo-300">
              Cross-note spread rank
            </span>
          </div>
          {domains?.domains && domains.domains.length > 0 ? (
            <DomainsList domains={domains.domains.slice(0, 10)} ranked searchable />
          ) : (
            <EmptyState
              title="Domains snapshot unavailable"
              message="No ranked domains were returned for the current trend window."
            />
          )}
          <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-indigo-300">
            <Link href="/trending/domains" className="hover:text-indigo-200">
              Open trend view
            </Link>
            <span className="text-zinc-600">•</span>
            <Link href="/search?tab=all" className="hover:text-indigo-200">
              Search linked notes
            </Link>
          </div>
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
