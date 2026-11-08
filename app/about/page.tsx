import type { Metadata } from "next";
import Link from "@/components/app-link";

import { PageHero } from "@/components/explorer/page-hero";

export const metadata: Metadata = {
  title: "About",
  description: "What Nostr is, and what NostrMash reads.",
};

export default function AboutPage() {
  return (
    <article className="space-y-8">
      <PageHero
        eyebrow="About"
        title="What this is"
        subtitle="A public reading of Nostr. No account, and no keys held here."
      />
      <div className="text-ink-soft max-w-[46rem] space-y-4 text-base leading-7">
        <p>
          Nostr is a protocol for publishing notes and following people. The notes live on relays,
          which are servers anyone can run. A reader chooses which relays to ask, and which people
          to follow. There is no single website that owns the network.
        </p>
        <p>
          NostrMash reads a set of those relays and ranks what is moving: notes, people, topics, and
          links. Each ranking says how it is ordered. The point is the comparison and the evidence,
          not a raw count on its own.
        </p>
        <p>
          <Link href="/methodology" className="nm-action-link">
            How rankings are made
          </Link>
        </p>
      </div>
    </article>
  );
}
