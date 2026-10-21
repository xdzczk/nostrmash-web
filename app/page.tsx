import type { Metadata } from "next";
import { Suspense } from "react";

import { DiscoverShell } from "@/components/discover/discover-shell";
import { HomeFreshness, HomeOverviewBody } from "@/components/home/home-overview-stream";
import { JsonLd } from "@/components/seo/json-ld";
import { DiscoverOverviewBodySkeleton } from "@/components/ui/skeleton";
import { loadHomePageData } from "@/lib/home/load-home-page-data";
import { toUrlSearchParams } from "@/lib/search-params/pagination";
import { readStatsWindow } from "@/lib/search-params/window";
import { absoluteUrl } from "@/lib/seo/metadata";

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
  const window = readStatsWindow(resolvedSearchParams);
  const currentSearchParams = toUrlSearchParams(resolvedSearchParams);
  // Kick off the fan-out without awaiting: the hero and tabs render in the
  // first flush and the data-dependent parts stream in behind Suspense.
  const home = loadHomePageData(resolvedSearchParams);
  // Both consumers await inside Suspense; this only prevents an
  // "unhandled rejection" warning if the loader fails before they mount.
  home.catch(() => undefined);

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
        searchParams={currentSearchParams}
        window={window}
        freshness={
          <Suspense fallback={null}>
            <HomeFreshness data={home} />
          </Suspense>
        }
        title="What has the network’s attention."
        subtitle="A calm, ranked briefing on the notes, people, and ideas moving through Nostr—with the evidence behind their momentum."
      >
        <Suspense fallback={<DiscoverOverviewBodySkeleton />}>
          <HomeOverviewBody data={home} />
        </Suspense>
      </DiscoverShell>
    </>
  );
}
