import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { PageHero } from "@/components/explorer/page-hero";
import { SearchForm } from "@/components/search/search-form";
import { SearchResults } from "@/components/search/search-results";
import { SectionCard } from "@/components/ui/section-card";
import { NotesListSkeleton } from "@/components/ui/skeleton";
import { displayQuery } from "@/lib/search/display";
import { resolveSearchIntent } from "@/lib/search/intent";
import { applyDiscoverLanguage } from "@/lib/search-params/language-preference";
import { parseSearchQuery } from "@/lib/search-params/search";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export const metadata: Metadata = {
  title: "Search",
  description: "Search notes, profiles, hashtags, and relays across NostrMash.",
};

export default async function SearchPage({ searchParams }: { searchParams: SearchParams }) {
  const rawParams = await searchParams;
  const query = parseSearchQuery(rawParams);
  const activeTab = query.tab ?? "all";
  const canQuery = query.q.length > 0;

  // Object queries leave this page. Notes and profiles tabs stay here so the
  // typeahead can still search the text of an identifier or a hashtag.
  if (canQuery && activeTab === "all") {
    const intent = resolveSearchIntent(query.q);
    if (intent.href) redirect(intent.href);
  }

  // Carry the Discover language cookie onto this route before rendering.
  await applyDiscoverLanguage("/search", rawParams);

  return (
    <div className="space-y-8">
      <PageHero
        eyebrow="Global search"
        title={canQuery ? `Results for “${displayQuery(query.q)}”` : "Find any public signal."}
        subtitle={
          canQuery
            ? undefined
            : "Search notes, people, topics, links, event identifiers, and relays from one focused index."
        }
        actions={
          <SearchForm initialQuery={query.q} inputId="search-page-input" className="max-w-3xl" />
        }
      />

      {!canQuery ? (
        <SectionCard
          title="Start with discovery"
          description="Search above, or continue with the strongest signals already moving across Nostr."
        >
          <nav aria-label="Search alternatives" className="grid gap-0 sm:grid-cols-3">
            {[
              {
                href: "/",
                label: "Discover overview",
                description: "The strongest signals across notes, people, topics, and links.",
              },
              {
                href: "/discovery/conversations/hot",
                label: "Active conversations",
                description: "Threads drawing meaningful attention now.",
              },
              {
                href: "/relays",
                label: "Network intelligence",
                description: "Relay concentration, reach, and health.",
              },
            ].map((entry) => (
              <Link
                key={entry.href}
                href={entry.href}
                className="border-edge/65 group border-t py-5 sm:border-l sm:px-5 sm:first:border-l-0"
              >
                <span className="text-ink group-hover:text-link text-sm font-medium">
                  {entry.label}
                </span>
                <span className="text-ink-muted mt-2 block text-sm leading-6">
                  {entry.description}
                </span>
              </Link>
            ))}
          </nav>
        </SectionCard>
      ) : (
        <Suspense
          fallback={
            <div className="space-y-6">
              <span className="sr-only" role="status">
                Loading search results
              </span>
              <NotesListSkeleton count={5} />
            </div>
          }
        >
          <SearchResults query={query} />
        </Suspense>
      )}
    </div>
  );
}
