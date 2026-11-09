import type { Metadata } from "next";
import Link from "@/components/app-link";
import { notFound } from "next/navigation";

import { PageHero } from "@/components/explorer/page-hero";
import { formatCompactNumber } from "@/components/explorer/utils";
import { getDiscoveryArchive, getDiscoveryArchiveDays } from "@/lib/api/endpoints";
import { ApiError } from "@/lib/api/errors";
import {
  archiveNeighbors,
  readArchiveDay,
  utcToday,
  type ArchiveEntry,
} from "@/lib/discover/archive";
import { authorBaselineComparison, baselineComparison } from "@/lib/discover/baseline";
import { buildOverviewBriefing } from "@/lib/discover/briefing";
import { buildEntityMetadata } from "@/lib/seo/metadata";
import type { EntityBaseline } from "@/lib/types/api";

const DAY = /^\d{4}-\d{2}-\d{2}$/;

type Params = Promise<{ date: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { date } = await params;
  if (!DAY.test(date) || date > utcToday()) return { title: "Day not found" };
  return buildEntityMetadata({
    title: `Overview for ${date}`,
    description: `Topics, links, and network counts saved for ${date}.`,
    path: `/day/${date}`,
  });
}

function people(count: number): string {
  return count === 1 ? "person" : "people";
}

function metricComparison(
  value: number | null,
  baseline: EntityBaseline | null,
  metric: string
): string | null {
  if (value === null || !baseline || baseline.metric !== metric || baseline.value !== value) {
    return null;
  }
  return baselineComparison(baseline);
}

function EntryList({
  entries,
  hrefFor,
  prefix = "",
}: {
  entries: ArchiveEntry[];
  hrefFor: (label: string) => string;
  prefix?: string;
}) {
  if (entries.length === 0) return null;
  return (
    <ol className="border-edge/70 divide-y divide-[var(--edge)] border-y">
      {entries.map((entry) => {
        const comparison = authorBaselineComparison(entry.baseline, entry.uniqueAuthors);
        return (
          <li key={entry.label} className="py-3">
            <Link href={hrefFor(entry.label)} className="text-ink font-medium hover:underline">
              {`${prefix}${entry.label.replace(/^#/, "")}`}
            </Link>
            <p className="text-ink-muted mt-1 text-sm">
              {comparison
                ? `${formatCompactNumber(entry.uniqueAuthors)} ${people(entry.uniqueAuthors)}, ${comparison}`
                : `${formatCompactNumber(entry.uniqueAuthors)} ${people(entry.uniqueAuthors)}`}
            </p>
          </li>
        );
      })}
    </ol>
  );
}

export default async function DayPage({ params }: { params: Params }) {
  const { date } = await params;
  const today = utcToday();
  if (!DAY.test(date) || date > today) notFound();

  let payload: unknown;
  try {
    payload = await getDiscoveryArchive(date);
  } catch (error) {
    if (error instanceof ApiError && error.isNotFound) notFound();
    throw error;
  }
  const day = readArchiveDay(payload);
  if (!day || day.date !== date) notFound();

  const days = await getDiscoveryArchiveDays(366).catch(() => [] as string[]);
  const { previous, next } = archiveNeighbors(days, date, today);
  const briefing = buildOverviewBriefing({
    hashtags: day.hashtags.map((entry) => ({
      hashtag: entry.label,
      unique_authors: entry.uniqueAuthors,
      baseline: entry.baseline,
    })),
    domains: day.domains.map((entry) => ({
      domain: entry.label,
      unique_authors: entry.uniqueAuthors,
      baseline: entry.baseline,
    })),
    noteVolume: day.noteVolume,
    noteVolumeBaseline: day.noteVolumeBaseline,
    activeAuthors: day.activeAuthors,
    activeAuthorsBaseline: day.activeAuthorsBaseline,
  });
  const noteComparison = metricComparison(day.noteVolume, day.noteVolumeBaseline, "note_volume");
  const authorComparison = metricComparison(
    day.activeAuthors,
    day.activeAuthorsBaseline,
    "active_authors"
  );

  return (
    <article className="space-y-10">
      <PageHero
        eyebrow="Archive"
        title={date}
        subtitle={briefing?.headline ?? "The overview saved for this UTC day."}
      />
      {previous || next ? (
        <nav aria-label="Other days" className="flex justify-between gap-4 text-sm">
          {previous ? (
            <Link href={`/day/${previous}`} className="nm-action-link">
              {previous}
            </Link>
          ) : (
            <span />
          )}
          {next ? (
            <Link href={`/day/${next}`} className="nm-action-link">
              {next}
            </Link>
          ) : null}
        </nav>
      ) : null}
      {day.hashtags.length > 0 ? (
        <section aria-labelledby="archive-topics" className="space-y-4">
          <h2 id="archive-topics" className="nm-title text-ink">
            Topics
          </h2>
          <EntryList
            entries={day.hashtags}
            prefix="#"
            hrefFor={(label) => `/hashtags/${encodeURIComponent(label.replace(/^#/, ""))}`}
          />
        </section>
      ) : null}
      {day.domains.length > 0 ? (
        <section aria-labelledby="archive-links" className="space-y-4">
          <h2 id="archive-links" className="nm-title text-ink">
            Links
          </h2>
          <EntryList
            entries={day.domains}
            hrefFor={(label) => `/domains/${encodeURIComponent(label)}`}
          />
        </section>
      ) : null}
      {day.noteVolume !== null || day.activeAuthors !== null ? (
        <section aria-labelledby="archive-network" className="space-y-3">
          <h2 id="archive-network" className="nm-title text-ink">
            Network
          </h2>
          <ul className="text-ink-soft space-y-2 text-sm">
            {day.noteVolume !== null ? (
              <li>
                {noteComparison
                  ? `${formatCompactNumber(day.noteVolume)} notes, ${noteComparison}`
                  : `${formatCompactNumber(day.noteVolume)} notes`}
              </li>
            ) : null}
            {day.activeAuthors !== null ? (
              <li>
                {authorComparison
                  ? `${formatCompactNumber(day.activeAuthors)} ${people(day.activeAuthors)}, ${authorComparison}`
                  : `${formatCompactNumber(day.activeAuthors)} ${people(day.activeAuthors)}`}
              </li>
            ) : null}
          </ul>
        </section>
      ) : null}
    </article>
  );
}
