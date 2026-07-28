import type { Metadata } from "next";

import { SectionCard } from "@/components/ui/section-card";
import { buildEntityMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildEntityMetadata({
  title: "Methodology",
  description:
    "How NostrMash indexes public Nostr events and how to interpret freshness, ranking windows, and limits.",
  path: "/methodology",
});

export default function MethodologyPage() {
  return (
    <div className="space-y-6">
      <section className="border-edge/95 bg-surface/55 rounded-xl border p-5 sm:p-6">
        <p className="text-ink-faint text-[11px] font-medium tracking-[0.18em] uppercase">
          Methodology
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">Methodology</h1>
        <p className="text-ink-dim mt-2 text-sm">
          NostrMash indexes public Nostr events and exposes read APIs for search and analytics. This
          page explains how to interpret freshness, ranking windows, and limits.
        </p>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard title="Index scope" description="What the explorer is and is not showing.">
          <ul className="text-ink-dim list-disc space-y-1 pl-5 text-sm">
            <li>Results are from the local NostrMash index, not the entire Nostr universe.</li>
            <li>Coverage varies by relay ingestion, retention, and projection health.</li>
            <li>
              Missing results can reflect index scope, not necessarily missing events globally.
            </li>
          </ul>
        </SectionCard>

        <SectionCard title="Freshness classes" description="How to read staleness tradeoffs.">
          <ul className="text-ink-dim list-disc space-y-1 pl-5 text-sm">
            <li>Static pages are cached longer and change infrequently.</li>
            <li>Discovery surfaces refresh on a short TTL (about one minute).</li>
            <li>Note and profile detail pages prefer request-time freshness.</li>
            <li>Home and stats show an honest last-indexed timestamp when available.</li>
          </ul>
        </SectionCard>

        <SectionCard title="Ranking windows" description="What 24h and 7d mean.">
          <ul className="text-ink-dim list-disc space-y-1 pl-5 text-sm">
            <li>Trending lists are scoped to a rolling window such as 24h or 7d.</li>
            <li>Scores combine activity signals (replies, reactions, zaps, velocity).</li>
            <li>Trust filters may prefer higher-trust authors depending on API mode.</li>
          </ul>
        </SectionCard>

        <SectionCard title="Limits" description="Practical bounds for consumers.">
          <ul className="text-ink-dim list-disc space-y-1 pl-5 text-sm">
            <li>Public API rate limits apply per IP and surface.</li>
            <li>Batch endpoints cap payload size to keep responses bounded.</li>
            <li>RSS feeds and sitemaps sample hot entities rather than the full index.</li>
          </ul>
        </SectionCard>
      </div>
    </div>
  );
}
