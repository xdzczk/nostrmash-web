import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import {
  RELAY_HEALTH_EXTRACT_LIMIT,
  extractRelayHealthRows,
  normalizeRelayHost,
  rankRelayActivity,
  readMetricNumber,
  selectRelayHealthForHost,
} from "@/components/explorer/stats-utils";
import { DebugDisclosure } from "@/components/explorer/debug-disclosure";
import { EmptyState } from "@/components/explorer/empty-state";
import { MetadataList } from "@/components/explorer/metadata-list";
import { AboutThisData } from "@/components/explorer/about-this-data";
import { PageHero } from "@/components/explorer/page-hero";
import { NetworkNav } from "@/components/explorer/network-nav";
import { RelayLink } from "@/components/relays/relay-link";
import { RelaySummaryCard } from "@/components/relays/relay-summary-card";
import { SectionCard } from "@/components/ui/section-card";
import { LoadErrors } from "@/components/ui/status-panels";
import { getRelayHealth, getRelayStats } from "@/lib/api/endpoints";
import { extractNativeApiSemantics } from "@/lib/api/normalize";
import { toUserFacingErrorMessage } from "@/lib/errors/user-message";
import { getRequestNowMs } from "@/lib/time/request-now";
import { isValidRelayHostParam, normalizeValidatedRelayHost } from "@/lib/routing/params";
import { buildEntityMetadata } from "@/lib/seo/metadata";

type Params = Promise<{ relayHost: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { relayHost } = await params;
  const label = normalizeValidatedRelayHost(relayHost) ?? relayHost;
  return buildEntityMetadata({
    title: label,
    description: `Indexed activity and health for the Nostr relay ${label}.`,
    path: `/relays/${encodeURIComponent(label)}`,
  });
}

export default async function RelayPage({ params }: { params: Params }) {
  const { relayHost } = await params;
  if (!isValidRelayHostParam(relayHost)) {
    notFound();
  }
  const normalizedRelayHost =
    normalizeValidatedRelayHost(relayHost) ||
    normalizeRelayHost(relayHost) ||
    relayHost.toLowerCase();
  const errors: string[] = [];
  let payload: Awaited<ReturnType<typeof getRelayStats>> | null = null;
  let healthPayload: Awaited<ReturnType<typeof getRelayHealth>> | null = null;

  const [statsResult, healthResult] = await Promise.allSettled([
    getRelayStats("shortTtl"),
    getRelayHealth("shortTtl"),
  ]);
  if (statsResult.status === "fulfilled") {
    payload = statsResult.value;
  } else {
    errors.push(toUserFacingErrorMessage(statsResult.reason, "Failed to load relay stats."));
  }
  if (healthResult.status === "fulfilled") {
    healthPayload = healthResult.value;
  } else {
    errors.push(toUserFacingErrorMessage(healthResult.reason, "Failed to load relay health."));
  }

  const rankedActivity = rankRelayActivity(payload, 200);
  const relayActivity = rankedActivity.find((entry) => entry.host === normalizedRelayHost) ?? null;
  const relayEntry = relayActivity?.metrics ?? null;
  const neighboringRelays = relayActivity
    ? rankedActivity.filter(
        (entry) =>
          entry.host !== normalizedRelayHost && Math.abs(entry.rank - relayActivity.rank) <= 3
      )
    : rankedActivity.slice(0, 5);
  const activityTotal = rankedActivity.reduce((sum, entry) => sum + entry.activityScore, 0);
  const activityShare =
    relayActivity && activityTotal > 0
      ? ((relayActivity.activityScore / activityTotal) * 100).toFixed(1)
      : null;
  const events = relayEntry ? readMetricNumber(relayEntry, "event_count", "events") : null;
  const authors = relayEntry ? readMetricNumber(relayEntry, "unique_authors") : null;

  const healthRows = extractRelayHealthRows(healthPayload, RELAY_HEALTH_EXTRACT_LIMIT);
  const nowMs = getRequestNowMs();
  const selectedHealth = selectRelayHealthForHost(healthRows, normalizedRelayHost, nowMs);
  const relayHealth = selectedHealth.row;
  const healthy =
    relayHealth?.healthy === true ? true : relayHealth?.healthy === false ? false : null;
  const semantics = extractNativeApiSemantics(payload, healthPayload);
  const metricItems = relayEntry
    ? Object.entries(relayEntry).map(([label, value]) => ({ label, value }))
    : [];

  return (
    <div className="space-y-8">
      <PageHero
        eyebrow="Relay"
        title={normalizedRelayHost}
        subtitle="Indexed event volume for this host, plus the latest ingest checkpoint. The volume is not split into a 24-hour or 7-day window."
      />
      <NetworkNav />

      <LoadErrors errors={errors} />

      <RelaySummaryCard
        host={normalizedRelayHost}
        rank={relayActivity?.rank ?? null}
        sharePercent={activityShare}
        events={events ?? relayActivity?.activityScore ?? null}
        authors={authors}
        healthy={relayHealth ? healthy : null}
        status={relayHealth?.status}
        checkpointAt={relayHealth?.latestCheckpointAt ?? relayHealth?.lastSeenAt}
        lastError={relayHealth?.lastError}
        observationCount={selectedHealth.count}
      />

      <SectionCard
        title="Indexed counts"
        description="Figures stored for this host. They describe volume in the relay stats, not whether the relay is reachable right now."
      >
        {metricItems.length > 0 ? (
          <MetadataList items={metricItems} columns={2} />
        ) : (
          <EmptyState
            title="Relay-level row not found"
            message="No direct relay row was found in the relay stats for this host."
          />
        )}
      </SectionCard>

      <SectionCard
        title={relayActivity ? "Adjacent in this ranking" : "Highest volume relays"}
        description={
          relayActivity
            ? "Relays within three ranks of this one, by indexed event volume."
            : "This host is outside the current ranking. These are the relays at the top of it."
        }
      >
        {neighboringRelays.length > 0 ? (
          <ul className="divide-edge/70 divide-y">
            {neighboringRelays.map((entry) => (
              <li key={entry.host} className="py-2">
                <RelayLink host={entry.host} rank={entry.rank} />
                <p className="text-ink-faint text-xs">
                  {entry.activityScore.toLocaleString()} events
                  {activityTotal > 0
                    ? ` · ${((entry.activityScore / activityTotal) * 100).toFixed(1)}% of this ranking`
                    : ""}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState message="No other relay rows were found in this response." />
        )}
      </SectionCard>

      <p className="text-ink-muted text-sm">
        <Link
          href={`/search?q=${encodeURIComponent(normalizedRelayHost)}&tab=notes`}
          className="nm-action-link"
        >
          Notes that mention this relay
        </Link>
      </p>

      <DebugDisclosure title="Debug payload: relay stats aggregate" data={payload ?? {}} />
      <AboutThisData semantics={semantics}>
        Activity rank uses indexed event volume. Health is the ingest checkpoint for this host, when
        the health response includes it.
      </AboutThisData>
      <DebugDisclosure title="Debug payload: relay health" data={healthPayload ?? {}} />
    </div>
  );
}
