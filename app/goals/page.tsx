import type { Metadata } from "next";
import Link from "@/components/app-link";

import { EmptyState } from "@/components/explorer/empty-state";
import { PageHero } from "@/components/explorer/page-hero";
import { ShareBar } from "@/components/relays/share-bar";
import { ErrorPanel } from "@/components/ui/status-panels";
import { getGoals } from "@/lib/api/endpoints";
import { toUserFacingErrorMessage } from "@/lib/errors/user-message";
import { buildEntityMetadata } from "@/lib/seo/metadata";
import { goalSats } from "@/lib/stats/surface-display";

export const metadata: Metadata = buildEntityMetadata({
  title: "Zap goals",
  description: "Open zap goals and how much of each target has been raised.",
  path: "/goals",
});

export default async function GoalsPage() {
  let goals: Awaited<ReturnType<typeof getGoals>>["goals"] = [];
  let errorMessage = "";
  try {
    goals = (await getGoals()).goals ?? [];
  } catch (error) {
    errorMessage = toUserFacingErrorMessage(error, "Zap goals are unavailable.");
  }

  return (
    <div className="space-y-6">
      <PageHero
        eyebrow="Goals"
        title="Zap goals"
        subtitle="Kind 9041 goals with the sats raised so far."
      />
      {errorMessage ? (
        <ErrorPanel message={errorMessage} retryHref="/goals" />
      ) : goals.length === 0 ? (
        <EmptyState message="No zap goals are in the index yet." />
      ) : (
        <ul className="space-y-5">
          {goals.map((goal) => {
            const target = goalSats(goal.amount_msats);
            const raised = goal.raised_sats ?? 0;
            return (
              <li key={goal.event_id}>
                <Link
                  href={`/notes/${encodeURIComponent(goal.event_id)}`}
                  className="text-ink hover:text-link text-sm font-medium"
                >
                  {goal.summary || "Zap goal"}
                </Link>
                <p className="text-ink-muted mt-1 text-xs tabular-nums">
                  {raised.toLocaleString()} sats raised
                  {target ? ` of ${Math.round(target).toLocaleString()}` : ""}
                </p>
                {target ? (
                  <ShareBar
                    value={raised}
                    max={target}
                    label={`${raised.toLocaleString()} of ${Math.round(target).toLocaleString()} sats`}
                  />
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
