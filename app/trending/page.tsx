import Link from "next/link";
import type { Metadata } from "next";

import { PageHero } from "@/components/explorer/page-hero";
import { SectionCard } from "@/components/ui/section-card";

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

export default function TrendingPage() {
  return (
    <div className="space-y-8">
      <PageHero
        title="Trending surfaces"
        subtitle="Compare top-ranked notes, profiles, and hashtag movement in one observability entry point."
      />
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
  );
}
