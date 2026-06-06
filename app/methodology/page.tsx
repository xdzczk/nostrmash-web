import { SectionCard } from "@/components/ui/section-card";

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
            <li>Trending and stats pages use short TTL caching to reduce request pressure.</li>
            <li>Search, profile, and note pages prioritize request-time freshness.</li>
          </ul>
        </SectionCard>

        <SectionCard title="Ranking windows" description="Time windows accepted by the API.">
          <ul className="text-ink-dim list-disc space-y-1 pl-5 text-sm">
            <li>Typical windows are `24h`, `7d`, and `30d` depending on endpoint class.</li>
            <li>Window constraints are enforced server-side by public request guards.</li>
            <li>Scores and rank positions can shift as backfill and ingest complete.</li>
          </ul>
        </SectionCard>

        <SectionCard title="Limits and pagination" description="Public API guardrails.">
          <ul className="text-ink-dim list-disc space-y-1 pl-5 text-sm">
            <li>Public endpoints cap `limit`, `offset`, and similar query parameters.</li>
            <li>Large queries can be rejected to protect service reliability.</li>
            <li>Use smaller windows and filters for more deterministic results.</li>
          </ul>
        </SectionCard>
      </div>
    </div>
  );
}
