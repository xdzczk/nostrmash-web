import Link from "next/link";

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
];

export default function TrendingPage() {
  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-6">
        <h1 className="text-2xl font-semibold tracking-tight">Trending</h1>
        <p className="mt-1 text-sm text-zinc-300">
          Browse the main trend surfaces and switch between notes, profiles, and hashtags.
        </p>
      </section>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sections.map((section) => (
          <SectionCard key={section.href} title={section.title} description={section.description}>
            <Link href={section.href} className="text-sm text-indigo-300 hover:text-indigo-200">
              Open page
            </Link>
          </SectionCard>
        ))}
      </div>
    </div>
  );
}
