import type { Metadata } from "next";
import { notFound } from "next/navigation";

import {
  extractRelayHealthRows,
  normalizeRelayHost,
  rankRelayActivity,
  readMetricNumber,
  relayCheckpointIsStale,
  selectRelayHealthForHost,
} from "@/components/explorer/stats-utils";
import { DebugDisclosure } from "@/components/explorer/debug-disclosure";
import { EmptyState } from "@/components/explorer/empty-state";
import { AboutThisData, readStatsSections } from "@/components/explorer/about-this-data";
import { PageHero } from "@/components/explorer/page-hero";
import { NetworkNav } from "@/components/explorer/network-nav";
import { WindowSelector } from "@/components/explorer/window-selector";
import { RelayLink } from "@/components/relays/relay-link";
import { RelayPublishedIcon } from "@/components/relays/relay-rank-row";
import { RelayPublishedInfo } from "@/components/relays/relay-published-info";
import { RelaySummaryCard } from "@/components/relays/relay-summary-card";
import { SectionCard } from "@/components/ui/section-card";
import { LoadErrors } from "@/components/ui/status-panels";
import { getRelayStats } from "@/lib/api/endpoints";
import { extractNativeApiSemantics } from "@/lib/api/normalize";
import { toUserFacingErrorMessage } from "@/lib/errors/user-message";
import { loadRelayDirectorySnapshot } from "@/lib/relays/load-relay-page";
import {
  httpUrl,
  publishedInfo,
  publishedRelayMarksByHost,
  relayDocumentTitle,
  relayMetaDescription,
  relayRankingDetail,
  withPublishedNames,
} from "@/lib/relays/nip11";
import { displayProbeStatus, probeStatusLabel } from "@/lib/relays/probe-status";
import { getRequestNowMs } from "@/lib/time/request-now";
import { isValidRelayHostParam, normalizeValidatedRelayHost } from "@/lib/routing/params";
import { toUrlSearchParams } from "@/lib/search-params/pagination";
import {
  RELAY_STATS_WINDOWS,
  formatStatsWindowLabel,
  readRelayStatsWindow,
} from "@/lib/search-params/window";
import { buildEntityMetadata } from "@/lib/seo/metadata";

type Params = Promise<{ relayHost: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { relayHost } = await params;
  const label = normalizeValidatedRelayHost(relayHost) ?? relayHost;
  const fallback = buildEntityMetadata({
    title: label,
    description: relayMetaDescription(label),
    path: `/relays/${encodeURIComponent(label)}`,
  });
  if (!isValidRelayHostParam(relayHost)) return fallback;
  const host = normalizeValidatedRelayHost(relayHost) ?? label;
  try {
    const snapshot = await loadRelayDirectorySnapshot(host);
    const info = publishedInfo(snapshot.info?.nip11);
    return buildEntityMetadata({
      title: relayDocumentTitle(host, info?.name),
      description: relayMetaDescription(host, info?.description),
      path: `/relays/${encodeURIComponent(host)}`,
    });
  } catch {
    return fallback;
  }
}

export default async function RelayPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { relayHost } = await params;
  const resolvedSearchParams = await searchParams;
  const window = readRelayStatsWindow(resolvedSearchParams);
  const currentSearchParams = toUrlSearchParams(resolvedSearchParams);
  if (!isValidRelayHostParam(relayHost)) {
    notFound();
  }
  const normalizedRelayHost =
    normalizeValidatedRelayHost(relayHost) ||
    normalizeRelayHost(relayHost) ||
    relayHost.toLowerCase();
  const errors: string[] = [];
  let payload: Awaited<ReturnType<typeof getRelayStats>> | null = null;

  const [statsResult, snapshot] = await Promise.all([
    getRelayStats("shortTtl", window).then(
      (value) => ({ status: "fulfilled" as const, value }),
      (reason: unknown) => ({ status: "rejected" as const, reason })
    ),
    loadRelayDirectorySnapshot(normalizedRelayHost),
  ]);
  if (statsResult.status === "fulfilled") {
    payload = statsResult.value;
  } else {
    errors.push(toUserFacingErrorMessage(statsResult.reason, "Failed to load relay stats."));
  }
  const healthPayload = snapshot.health;
  const popular = snapshot.popular;
  const probes = snapshot.probes;
  if (snapshot.healthError) {
    errors.push(toUserFacingErrorMessage(snapshot.healthError, "Failed to load relay health."));
  }
  if (snapshot.popularError) {
    errors.push(toUserFacingErrorMessage(snapshot.popularError, "Failed to load listed relays."));
  }
  if (snapshot.probeError) {
    errors.push(toUserFacingErrorMessage(snapshot.probeError, "Failed to load connection checks."));
  }
  if (snapshot.infoError) {
    errors.push(
      toUserFacingErrorMessage(snapshot.infoError, "Failed to load the relay description.")
    );
  }

  const rankedActivity = rankRelayActivity(payload, 200, window);
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

  const healthRows = extractRelayHealthRows(healthPayload);
  const nowMs = getRequestNowMs();
  const selectedHealth = selectRelayHealthForHost(healthRows, normalizedRelayHost, nowMs);
  const relayHealth = selectedHealth.row;
  const healthy =
    relayHealth?.healthy === true ? true : relayHealth?.healthy === false ? false : null;
  const semantics = extractNativeApiSemantics(payload, healthPayload);

  const listedIndex =
    popular?.relays.findIndex(
      (relay) => normalizeRelayHost(relay.normalized_url ?? "") === normalizedRelayHost
    ) ?? -1;
  const listed = listedIndex >= 0 ? popular?.relays[listedIndex] : undefined;
  const probe =
    probes?.relays.find(
      (relay) => normalizeRelayHost(relay.normalized_url ?? "") === normalizedRelayHost
    ) ?? null;
  const publishedByHost = publishedRelayMarksByHost(popular?.relays);
  const published = publishedInfo(snapshot.info?.nip11);
  const publishedName = published?.name?.trim() || undefined;
  const iconSrc = httpUrl(published?.icon);
  const bannerSrc = httpUrl(published?.banner);
  const rankingSentence = `Indexed rank, who lists it, and whether we could read it over ${formatStatsWindowLabel(window).toLowerCase()}.`;

  return (
    <div className="space-y-8">
      <PageHero
        eyebrow="Relay"
        title={publishedName ?? normalizedRelayHost}
        subtitle={publishedName ? normalizedRelayHost : rankingSentence}
        icon={iconSrc ? { src: iconSrc, alt: publishedName ? "" : "Relay icon" } : undefined}
        bannerSrc={bannerSrc ?? undefined}
        badges={
          <WindowSelector
            path={`/relays/${encodeURIComponent(normalizedRelayHost)}`}
            searchParams={currentSearchParams}
            activeWindow={window}
            windows={RELAY_STATS_WINDOWS}
          />
        }
        support={
          publishedName ? (
            <p className="text-ink-muted max-w-[46rem] text-sm leading-6">{rankingSentence}</p>
          ) : null
        }
      />
      <NetworkNav />

      <LoadErrors errors={errors} />

      <RelaySummaryCard
        host={normalizedRelayHost}
        rank={relayActivity?.rank ?? null}
        sharePercent={activityShare}
        events={events ?? relayActivity?.activityScore ?? null}
        authors={authors}
        listedRank={listed ? listedIndex + 1 : null}
        listedUsers={listed?.distinct_users ?? null}
        listedKnown={popular !== null}
        healthy={relayHealth ? healthy : null}
        inCurrentRead={relayHealth ? !relayCheckpointIsStale(relayHealth, nowMs) : false}
        checkpointAt={relayHealth?.latestCheckpointAt ?? relayHealth?.lastSeenAt}
        lastError={relayHealth?.lastError}
        observationCount={selectedHealth.count}
        connectLabel={probe ? probeStatusLabel(displayProbeStatus(probe)) : null}
        connectLatencyMs={probe?.avg_connect_latency_ms}
        relayUrl={snapshot.relayUrl}
        window={window}
      />

      <RelayPublishedInfo nip11={snapshot.info?.nip11 ?? null} />

      <SectionCard
        title={relayActivity ? "Adjacent in this ranking" : "Highest volume relays"}
        description={withPublishedNames(
          relayActivity
            ? "Relays within three ranks of this one, by indexed event volume."
            : "This host is outside the current ranking. These are the relays at the top of it.",
          neighboringRelays.some((entry) => publishedByHost.has(entry.host)),
          "indexed"
        )}
      >
        {neighboringRelays.length > 0 ? (
          <ul className="divide-edge/70 divide-y">
            {neighboringRelays.map((entry) => {
              const mark = publishedByHost.get(entry.host);
              const share =
                activityTotal > 0
                  ? `${((entry.activityScore / activityTotal) * 100).toFixed(1)}% of this ranking`
                  : null;
              return (
                <li key={entry.host} className="py-2">
                  <RelayLink
                    host={entry.host}
                    rank={entry.rank}
                    window={window}
                    label={mark?.name}
                    icon={mark?.iconSrc ? <RelayPublishedIcon src={mark.iconSrc} /> : undefined}
                  />
                  <p className="text-ink-muted text-sm">
                    {relayRankingDetail(entry.host, mark?.name, [
                      `${entry.activityScore.toLocaleString()} events`,
                      share,
                    ])}
                  </p>
                </li>
              );
            })}
          </ul>
        ) : (
          <EmptyState message="No other relay rows were found in this response." />
        )}
      </SectionCard>

      <DebugDisclosure title="Debug payload: relay stats aggregate" data={payload ?? {}} />
      <AboutThisData semantics={semantics} sections={readStatsSections(payload)}>
        Activity rank uses indexed event volume for {formatStatsWindowLabel(window).toLowerCase()}.
        This page is the hostname, so every URL on that host is listed here. Ingest is the
        checkpoint the status page lists first. The connection check is the latest probe for this
        host. When the relay has published a description, that text is its own account of itself and
        is separate from both.
      </AboutThisData>
      <DebugDisclosure title="Debug payload: relay health" data={healthPayload ?? {}} />
      {snapshot.info ? (
        <DebugDisclosure title="Debug payload: relay description" data={snapshot.info} />
      ) : null}
    </div>
  );
}
