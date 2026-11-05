import type { Metadata } from "next";
import Link from "@/components/app-link";

import { EmptyState } from "@/components/explorer/empty-state";
import { PageHero } from "@/components/explorer/page-hero";
import { ErrorPanel } from "@/components/ui/status-panels";
import { getPolls } from "@/lib/api/endpoints";
import { toUserFacingErrorMessage } from "@/lib/errors/user-message";
import { readSearchParam } from "@/lib/search-params/pagination";
import { buildEntityMetadata } from "@/lib/seo/metadata";
import { pollTypeLabel } from "@/lib/stats/surface-display";
import type { PollSort } from "@/lib/types/surfaces";

export const metadata: Metadata = buildEntityMetadata({
  title: "Polls",
  description: "Recent polls and the polls with the most votes.",
  path: "/polls",
});

function readSort(value: string | undefined): PollSort {
  return value === "votes" ? "votes" : "recent";
}

export default async function PollsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolved = await searchParams;
  const sort = readSort(readSearchParam(resolved, "sort"));
  let polls: Awaited<ReturnType<typeof getPolls>>["polls"] = [];
  let errorMessage = "";
  try {
    polls = (await getPolls(sort)).polls ?? [];
  } catch (error) {
    errorMessage = toUserFacingErrorMessage(error, "Polls are unavailable.");
  }

  return (
    <div className="space-y-6">
      <PageHero
        eyebrow="Polls"
        title="Polls"
        subtitle="Kind 1068 polls, with the vote totals indexed so far."
        badges={
          <nav aria-label="Poll sort" className="flex gap-3 text-sm">
            <Link
              href="/polls"
              aria-current={sort === "recent" ? "page" : undefined}
              className={sort === "recent" ? "text-ink" : "text-link"}
            >
              Recent
            </Link>
            <Link
              href="/polls?sort=votes"
              aria-current={sort === "votes" ? "page" : undefined}
              className={sort === "votes" ? "text-ink" : "text-link"}
            >
              Most votes
            </Link>
          </nav>
        }
      />
      {errorMessage ? (
        <ErrorPanel message={errorMessage} retryHref="/polls" />
      ) : polls.length === 0 ? (
        <EmptyState message="No polls are in the index yet." />
      ) : (
        <ul className="divide-edge/70 divide-y">
          {polls.map((poll) => (
            <li key={poll.event_id} className="py-3">
              <Link
                href={`/notes/${encodeURIComponent(poll.event_id)}`}
                className="text-ink hover:text-link text-sm font-medium"
              >
                {poll.question || "Untitled poll"}
              </Link>
              <p className="text-ink-muted mt-1 text-xs">
                {pollTypeLabel(poll.poll_type) ?? "Poll"}
                {typeof poll.votes === "number" ? ` · ${poll.votes.toLocaleString()} votes` : ""}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
