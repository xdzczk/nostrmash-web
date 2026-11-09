import type { Metadata } from "next";

import { YourView } from "@/components/me/your-view";
import { PageHero } from "@/components/explorer/page-hero";

export const metadata: Metadata = {
  title: "Your view",
  description:
    "Keep a public key in this browser. It ranks Discover and the trending lists by what the accounts it follows engage with. Forgetting the key returns the global lists.",
};

export default function MePage() {
  return (
    <article className="space-y-8">
      <PageHero
        eyebrow="Your view"
        title="A key for this browser"
        subtitle="Paste an npub, or sign with a browser signer if you have one. Discover and the trending lists use that key."
      />
      <YourView />
    </article>
  );
}
