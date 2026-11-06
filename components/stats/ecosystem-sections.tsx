import { AccountAgeList } from "@/components/stats/surface-sections";
import { ShareBar } from "@/components/relays/share-bar";
import { StatCard, StatGrid } from "@/components/explorer/stat-card";
import { BarSeries } from "@/components/stats/bar-series";
import { concentrationCaption, formatZapLatency } from "@/lib/stats/headlines";
import { SectionCard } from "@/components/ui/section-card";
import {
  clientLabel,
  dailyCountPoints,
  formatBasisPointsAsPercent,
  formatUnitShare,
  sumOptional,
  summedHistogram,
  UNATTRIBUTED_CLIENT,
  ZAP_HISTOGRAM_LABELS,
} from "@/lib/stats/ecosystem-display";
import { formatStatsWindowLength } from "@/lib/search-params/window";
import type { StatsWindow } from "@/lib/search-params/window";
import type {
  AccountStatsResponse,
  ClientStatsResponse,
  IdentityStatsResponse,
  ZapStatsResponse,
} from "@/lib/types/api";

const CLIENT_LIMIT = 12;

function DomainList({
  title,
  rows,
}: {
  title: string;
  rows: Array<{ domain: string; count?: number }>;
}) {
  if (rows.length === 0) return null;
  const max = Math.max(...rows.map((row) => row.count ?? 0), 1);
  return (
    <div>
      <h3 className="text-ink text-sm font-medium">{title}</h3>
      <ul className="divide-edge/70 mt-2 divide-y">
        {rows.map((row) => (
          <li key={row.domain} className="py-2">
            <div className="flex items-baseline justify-between gap-4">
              <span className="text-ink-soft truncate text-sm">{row.domain}</span>
              {typeof row.count === "number" ? (
                <span className="text-ink shrink-0 text-sm font-medium tabular-nums">
                  {row.count.toLocaleString()}
                </span>
              ) : null}
            </div>
            {typeof row.count === "number" ? (
              <ShareBar
                value={row.count}
                max={max}
                label={`${row.domain}, ${row.count.toLocaleString()}`}
              />
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ClientStatsSection({
  data,
  window,
}: {
  data: ClientStatsResponse | null;
  window: StatsWindow;
}) {
  const clients = data?.clients ?? [];
  const flags = data?.content_flags;
  const flagValues = flags
    ? [flags.events, flags.bridged_share, flags.content_warning_share, flags.pow_share]
    : [];
  const hasFlags = flagValues.some((value) => typeof value === "number" && value > 0);
  if (clients.length === 0 && !hasFlags) return null;
  const shown = clients.slice(0, CLIENT_LIMIT);
  const max = Math.max(...shown.map((client) => client.event_count ?? 0), 1);
  const range = formatStatsWindowLength(window);

  return (
    <SectionCard
      id="clients"
      title="Clients"
      description={`Clients named on events over the last ${range}.`}
    >
      {shown.length > 0 ? (
        <ul className="divide-edge/70 divide-y">
          {shown.map((client) => {
            const unattributed = client.client === UNATTRIBUTED_CLIENT;
            const authors =
              !unattributed && typeof client.unique_authors === "number"
                ? `${client.unique_authors.toLocaleString()} authors`
                : null;
            return (
              <li key={client.client} className="py-3">
                <div className="flex items-baseline justify-between gap-4">
                  <p className="text-ink text-sm font-medium">{clientLabel(client.client)}</p>
                  {typeof client.event_count === "number" ? (
                    <p className="text-ink shrink-0 text-sm font-semibold tabular-nums">
                      {client.event_count.toLocaleString()}
                    </p>
                  ) : null}
                </div>
                {authors ? <p className="text-ink-muted mt-0.5 text-xs">{authors}</p> : null}
                {typeof client.event_count === "number" ? (
                  <ShareBar
                    value={client.event_count}
                    max={max}
                    label={`${clientLabel(client.client)}, ${client.event_count.toLocaleString()} events`}
                  />
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : null}
      {clients.length > shown.length ? (
        <p className="text-ink-faint mt-3 text-xs">
          Showing {shown.length.toLocaleString()} of {clients.length.toLocaleString()} clients.
        </p>
      ) : null}
      {flags && (clients.length > 0 || hasFlags) ? (
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {typeof flags.events === "number" ? (
            <StatCard plain label="Events" value={flags.events} description="Events in this mix." />
          ) : null}
          {typeof flags.bridged_share === "number" ? (
            <StatCard plain label="Bridged" value={formatUnitShare(flags.bridged_share)} />
          ) : null}
          {typeof flags.content_warning_share === "number" ? (
            <StatCard
              plain
              label="Content warning"
              value={formatUnitShare(flags.content_warning_share)}
            />
          ) : null}
          {typeof flags.pow_share === "number" ? (
            <StatCard plain label="Proof of work" value={formatUnitShare(flags.pow_share)} />
          ) : null}
        </div>
      ) : null}
    </SectionCard>
  );
}

export function ZapStatsSection({
  data,
  window,
}: {
  data: ZapStatsResponse | null;
  window: StatsWindow;
}) {
  const series = data?.series ?? [];
  const satsPoints = dailyCountPoints(series, (day) =>
    "sats_total" in day ? day.sats_total : undefined
  );
  const countPoints = dailyCountPoints(series, (day) =>
    "zap_count" in day ? day.zap_count : undefined
  );
  const histogram = summedHistogram(series);
  const histogramMax = Math.max(...histogram.map((bucket) => bucket.count), 1);
  const nutzapCount = sumOptional(series.map((day) => day.nutzap_count));
  const nutzapSats = sumOptional(series.map((day) => day.nutzap_sats));
  const selfZaps = sumOptional(series.map((day) => day.self_zap_count));
  const latestAmounts = [...series]
    .reverse()
    .find(
      (day) =>
        typeof day.amount_p50_sats === "number" ||
        typeof day.amount_p90_sats === "number" ||
        typeof day.amount_mean_sats === "number" ||
        typeof day.gini_bps === "number" ||
        typeof day.ttfz_p50_s === "number"
    );
  const hasSeries = satsPoints.length > 0 || countPoints.length > 0;
  const hasParticipants =
    (typeof data?.unique_senders === "number" && data.unique_senders > 0) ||
    (typeof data?.unique_receivers === "number" && data.unique_receivers > 0);
  const hasNutzaps = (nutzapCount ?? 0) > 0 || (nutzapSats ?? 0) > 0;
  if (!hasSeries && !hasParticipants && !hasNutzaps && histogram.length === 0 && !latestAmounts) {
    return null;
  }
  const range = formatStatsWindowLength(window);

  return (
    <SectionCard id="zaps" title="Zaps" description={`Zap receipts over the last ${range}.`}>
      {hasParticipants || hasNutzaps || (selfZaps ?? 0) > 0 || latestAmounts ? (
        <StatGrid>
          {typeof data?.unique_senders === "number" ? (
            <StatCard
              plain
              label="Senders"
              value={data.unique_senders}
              description="People who sent a zap in this window."
            />
          ) : null}
          {typeof data?.unique_receivers === "number" ? (
            <StatCard
              plain
              label="Receivers"
              value={data.unique_receivers}
              description="People who received a zap in this window."
            />
          ) : null}
          {hasNutzaps && nutzapCount !== null ? (
            <StatCard plain label="Nutzaps" value={nutzapCount} />
          ) : null}
          {hasNutzaps && nutzapSats !== null ? (
            <StatCard plain label="Nutzap sats" value={nutzapSats} />
          ) : null}
          {selfZaps !== null && selfZaps > 0 ? (
            <StatCard plain label="Self-zaps" value={selfZaps} />
          ) : null}
          {typeof latestAmounts?.amount_p50_sats === "number" ? (
            <StatCard plain label="Median zap, sats" value={latestAmounts.amount_p50_sats} />
          ) : null}
          {typeof latestAmounts?.amount_p90_sats === "number" ? (
            <StatCard plain label="90th percentile, sats" value={latestAmounts.amount_p90_sats} />
          ) : null}
          {typeof latestAmounts?.amount_mean_sats === "number" ? (
            <StatCard plain label="Mean zap, sats" value={latestAmounts.amount_mean_sats} />
          ) : null}
          {typeof latestAmounts?.gini_bps === "number" ? (
            <StatCard
              plain
              label="Concentration"
              value={formatBasisPointsAsPercent(latestAmounts.gini_bps)}
              description={concentrationCaption()}
            />
          ) : null}
          {typeof latestAmounts?.ttfz_p50_s === "number" ? (
            <StatCard
              plain
              label="Time to first zap"
              value={formatZapLatency(latestAmounts.ttfz_p50_s)}
              description="Median time from a note to its first zap, on the latest day with a figure."
            />
          ) : null}
        </StatGrid>
      ) : null}
      {hasSeries ? (
        <div className="grid gap-8 lg:grid-cols-2">
          {satsPoints.length > 0 ? <BarSeries points={satsPoints} label="Sats per day" /> : null}
          {countPoints.length > 0 ? <BarSeries points={countPoints} label="Zaps per day" /> : null}
        </div>
      ) : null}
      {histogram.length > 0 ? (
        <div className="mt-6">
          <h3 className="text-ink text-sm font-medium">Zap size</h3>
          <ul className="mt-3 space-y-3">
            {histogram.map((bucket) => (
              <li key={bucket.key}>
                <div className="flex items-baseline justify-between gap-4">
                  <span className="text-ink-soft text-sm">{ZAP_HISTOGRAM_LABELS[bucket.key]}</span>
                  <span className="text-ink text-sm font-medium tabular-nums">
                    {bucket.count.toLocaleString()}
                  </span>
                </div>
                <ShareBar
                  value={bucket.count}
                  max={histogramMax}
                  label={`${ZAP_HISTOGRAM_LABELS[bucket.key]}, ${bucket.count.toLocaleString()}`}
                />
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </SectionCard>
  );
}

export function AccountStatsSection({ data }: { data: AccountStatsResponse | null }) {
  const days = data?.new_authors ?? [];
  const points = dailyCountPoints(days, (day) => ("count" in day ? day.count : undefined));
  const hasActive =
    typeof data?.active_authors_1d === "number" ||
    typeof data?.active_authors_7d === "number" ||
    typeof data?.active_authors_30d === "number" ||
    typeof data?.dormant_30d === "number" ||
    typeof data?.unfollow_rate_bps === "number";
  const ages = data?.account_age ?? [];
  if (points.length === 0 && !hasActive && ages.length === 0) return null;
  return (
    <SectionCard
      id="accounts"
      title="Accounts"
      description="New authors are first-seen counts over 30 days. Active authors posted in the last 1, 7, or 30 days."
    >
      {hasActive ? (
        <StatGrid>
          {typeof data?.active_authors_1d === "number" ? (
            <StatCard
              plain
              label="Active, 1 day"
              value={data.active_authors_1d}
              description="People who posted in the last day."
            />
          ) : null}
          {typeof data?.active_authors_7d === "number" ? (
            <StatCard
              plain
              label="Active, 7 days"
              value={data.active_authors_7d}
              description="People who posted in the last 7 days."
            />
          ) : null}
          {typeof data?.active_authors_30d === "number" ? (
            <StatCard
              plain
              label="Active, 30 days"
              value={data.active_authors_30d}
              description="People who posted in the last 30 days."
            />
          ) : null}
          {typeof data?.dormant_30d === "number" ? (
            <StatCard
              plain
              label="Dormant"
              value={data.dormant_30d}
              description="Accounts with no post in the last 30 days."
            />
          ) : null}
          {typeof data?.unfollow_rate_bps === "number" ? (
            <StatCard
              plain
              label="Unfollow rate"
              value={formatBasisPointsAsPercent(data.unfollow_rate_bps)}
              description="Share of follow changes in the last 7 days that were unfollows."
            />
          ) : null}
        </StatGrid>
      ) : null}
      <div className="mb-6">
        <h3 className="text-ink mb-3 text-sm font-medium">Account age</h3>
        <AccountAgeList buckets={ages} />
      </div>
      {points.length > 0 ? (
        <div>
          <BarSeries points={points} label="New authors per day" />
        </div>
      ) : null}
    </SectionCard>
  );
}

export function IdentityStatsSection({ data }: { data: IdentityStatsResponse | null }) {
  if (!data) return null;
  const verified =
    typeof data.nip05_verified === "number" && data.nip05_verified > 0 ? data.nip05_verified : null;
  const cards: Array<{ label: string; value: string | number; description?: string }> = [];
  if (typeof data.profiles === "number") cards.push({ label: "Profiles", value: data.profiles });
  if (typeof data.nip05_present === "number") {
    cards.push({ label: "NIP-05 present", value: data.nip05_present });
  }
  if (verified !== null) cards.push({ label: "NIP-05 verified", value: verified });
  if (typeof data.lud16_present === "number") {
    cards.push({ label: "Lightning address present", value: data.lud16_present });
  }
  if (typeof data.lud06_present === "number") {
    cards.push({ label: "LNURL present", value: data.lud06_present });
  }
  if (typeof data.bot_flagged === "number") {
    cards.push({ label: "Bot flagged", value: data.bot_flagged });
  }
  if (typeof data.avg_completeness === "number") {
    cards.push({
      label: "Average completeness",
      value: `${data.avg_completeness.toLocaleString(undefined, { maximumFractionDigits: 2 })} / 8`,
    });
  }
  const nip05Domains = data.nip05_domains ?? [];
  const lud16Domains = data.lud16_domains ?? [];
  if (cards.length === 0 && nip05Domains.length === 0 && lud16Domains.length === 0) return null;

  return (
    <SectionCard id="identity" title="Identity" description="Profile fields currently on record.">
      {cards.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((card) => (
            <StatCard
              key={card.label}
              plain
              label={card.label}
              value={card.value}
              description={card.description}
            />
          ))}
        </div>
      ) : null}
      {nip05Domains.length > 0 || lud16Domains.length > 0 ? (
        <div className="mt-6 grid gap-8 lg:grid-cols-2">
          <DomainList title="NIP-05 domains" rows={nip05Domains} />
          <DomainList title="Lightning address domains" rows={lud16Domains} />
        </div>
      ) : null}
    </SectionCard>
  );
}
