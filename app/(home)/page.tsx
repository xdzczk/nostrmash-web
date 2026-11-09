import type { Metadata } from "next";
import { Suspense } from "react";

import { DiscoverShell } from "@/components/discover/discover-shell";
import { Orientation } from "@/components/discover/orientation";
import {
  HomeFreshness,
  HomeHeadline,
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
      title: { absolute: "What’s moving on Nostr — NostrMash" },
      description: "Understand what is moving on Nostr, who is shaping it, and why it matters.",
      openGraph: {
        title: "What’s moving on Nostr — NostrMash",
        description: "Understand what is moving on Nostr, who is shaping it, and why it matters.",
      },
      twitter: {
        title: "What’s moving on Nostr — NostrMash",
        description: "Understand what is moving on Nostr, who is shaping it, and why it matters.",
      },
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
        headline={
          <Suspense
            fallback={
              <h1 className="nm-display-lg text-ink-strong min-w-0">
                What has the network’s attention.
              </h1>
            }
          >
            <HomeHeadline data={home} />
          </Suspense>
        }
        subtitle=""
        heroSupport={<Orientation />}
      >
        <Suspense fallback={<DiscoverOverviewBodySkeleton />}>
          <HomeOverviewBody data={home} />
        </Suspense>
      </DiscoverShell>
    </>
  );
}
