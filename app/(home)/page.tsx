import type { Metadata } from "next";
import { Suspense } from "react";

import { DiscoverShell } from "@/components/discover/discover-shell";
import {
  HomeFreshness,
  HomeLanguageSelector,
  HomeOverviewBody,
} from "@/components/home/home-overview-stream";
import { LanguageSelector } from "@/components/explorer/language-selector";
import { JsonLd } from "@/components/seo/json-ld";
import { DiscoverOverviewBodySkeleton } from "@/components/ui/skeleton";
import { isDiscovery30dHidden, syncDiscoveryWindow } from "@/lib/discover/window-fallback";
import { loadHomePageData } from "@/lib/home/load-home-page-data";
import { applyDiscoverLanguage } from "@/lib/search-params/language-preference";
import { readLanguage } from "@/lib/search-params/language";
import { toUrlSearchParams } from "@/lib/search-params/pagination";
import {
  formatDiscoveryWindowEyebrow,
  readStatsWindow,
  selectableStatsWindows,
} from "@/lib/search-params/window";
import { absoluteUrl, withLanguageVariantMetadata } from "@/lib/seo/metadata";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata({
  searchParams,
}: {
  searchParams: SearchParams;
}): Promise<Metadata> {
  const lang = readLanguage(await searchParams);
  return withLanguageVariantMetadata(
    {
      title: { absolute: "NostrMash" },
      description:
        "Explore Nostr notes, profiles, relays, and live trends through a public discovery index.",
      alternates: {
        types: {
          "application/rss+xml": [{ url: "/feeds/trending-notes.xml", title: "Trending notes" }],
        },
      },
    },
    lang,
    "/"
  );
}

export const revalidate = 60;

export default async function HomePage({ searchParams }: { searchParams: SearchParams }) {
  const resolvedSearchParams = await searchParams;
  const language = await applyDiscoverLanguage("/", resolvedSearchParams);
  await syncDiscoveryWindow("/", resolvedSearchParams);
  const window = readStatsWindow(resolvedSearchParams);
  const windows = selectableStatsWindows(!(await isDiscovery30dHidden()));
  const currentSearchParams = toUrlSearchParams(resolvedSearchParams);
  const query = currentSearchParams.toString();
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
        windows={windows}
        language={language}
        languageControl={
          <Suspense
            fallback={
              <LanguageSelector path="/" query={query} activeLanguage={language} options={[]} />
            }
          >
            <HomeLanguageSelector
              data={home}
              path="/"
              query={query}
              language={language}
              window={window}
            />
          </Suspense>
        }
        freshness={
          <Suspense fallback={null}>
            <HomeFreshness data={home} />
          </Suspense>
        }
        eyebrow={formatDiscoveryWindowEyebrow(window)}
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
