import type { Metadata } from "next";

import { DiscoverShell } from "@/components/discover/discover-shell";
import { EditorialOverview } from "@/components/discover/overview/editorial-overview";
import { JsonLd } from "@/components/seo/json-ld";
import { getStaleDataNotice } from "@/lib/api/http";
import { loadHomePageData } from "@/lib/home/load-home-page-data";
import { absoluteUrl } from "@/lib/seo/metadata";
import { formatUpdatedRelative } from "@/lib/time/freshness";

export const metadata: Metadata = {
  title: "NostrMash",
  description:
    "Explore Nostr notes, profiles, relays, and live trends through a public discovery index.",
  alternates: {
    types: {
      "application/rss+xml": [{ url: "/feeds/trending-notes.xml", title: "Trending notes" }],
    },
  },
};

export const revalidate = 60;

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function HomePage({ searchParams }: { searchParams: SearchParams }) {
  const resolvedSearchParams = await searchParams;
  const home = await loadHomePageData(resolvedSearchParams);
  const hasContent =
    home.homeNotes.length > 0 ||
    home.hydratedHomeProfiles.length > 0 ||
    home.homeHashtags.length > 0 ||
    home.homeDomains.length > 0;

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "NostrMash",
          url: absoluteUrl("/"),
          potentialAction: {
            "@type": "SearchAction",
            target: `${absoluteUrl("/search")}?q={search_term_string}`,
            "query-input": "required name=search_term_string",
          },
        }}
      />
      <DiscoverShell
        view="overview"
        path="/"
        searchParams={home.currentSearchParams}
        window={home.window}
        freshnessLabel={formatUpdatedRelative(home.computedAt)}
        staleMessage={getStaleDataNotice()}
        errorMessage={home.errorMessage}
        hasContent={hasContent}
        title="What has the network’s attention."
        subtitle="A calm, ranked briefing on the notes, people, and ideas moving through Nostr—with the evidence behind their momentum."
        heroSupport={
          <p className="text-ink-faint text-xs">
            Ranked by momentum · public relay scope · transparent evidence
          </p>
        }
      >
        {hasContent ? (
          <EditorialOverview
            notes={home.homeNotes}
            profiles={home.hydratedHomeProfiles}
            hashtags={home.homeHashtags}
            domains={home.homeDomains}
            authorsByPubkey={home.noteAuthorsByPubkey}
            pulseStats={home.pulseStats}
            sectionFailures={home.sectionFailures}
            window={home.window}
          />
        ) : null}
      </DiscoverShell>
    </>
  );
}
