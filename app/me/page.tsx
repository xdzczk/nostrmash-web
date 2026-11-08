import type { Metadata } from "next";

import { YourView } from "@/components/me/your-view";
import { PageHero } from "@/components/explorer/page-hero";

export const metadata: Metadata = {
  title: "Your view",
  description: "Keep a public key in this browser and open that profile.",
};

export default function MePage() {
  return (
    <article className="space-y-8">
      <PageHero
        eyebrow="Your view"
        title="A key for this browser"
        subtitle="Paste an npub, or sign with a browser signer if you have one."
      />
      <YourView />
    </article>
  );
}
