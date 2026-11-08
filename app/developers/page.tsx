import type { Metadata } from "next";

import { PageHero } from "@/components/explorer/page-hero";

export const metadata: Metadata = {
  title: "Developers",
  description: "The public NostrMash read API.",
};

const BASE = "https://api.nostrmash.com";

const EXAMPLES = [
  {
    label: "Homepage briefing data",
    path: "/api/v1/discovery/home?window=24h",
  },
  {
    label: "Topics moving faster than their recent pace",
    path: "/api/v1/hashtags/emerging",
  },
  {
    label: "Author posting hours",
    path: "/api/v1/authors/{pubkey}/analytics/posting-patterns?window=30d",
  },
  {
    label: "Where one event was seen",
    path: "/api/v1/events/{id}/seen-on",
  },
];

export default function DevelopersPage() {
  return (
    <article className="space-y-8">
      <PageHero
        eyebrow="Developers"
        title="Read the index"
        subtitle="JSON over HTTPS. No key required for these reads."
      />
      <div className="text-ink-soft max-w-[46rem] space-y-4 text-base leading-7">
        <p>
          The public API is <span className="text-ink">{BASE}</span>. A busy index answers with HTTP
          429; wait and retry. Paths that take a pubkey or an event id are reads of public events.
        </p>
        <ul className="space-y-3">
          {EXAMPLES.map((example) => (
            <li key={example.path}>
              <p className="text-ink text-sm">{example.label}</p>
              <code className="text-ink-muted mt-1 block text-xs break-all">
                {`GET ${BASE}${example.path}`}
              </code>
            </li>
          ))}
        </ul>
      </div>
    </article>
  );
}
