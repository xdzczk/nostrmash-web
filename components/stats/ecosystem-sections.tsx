import { BarChart } from "@/components/charts/bar-chart";
import { ShareBar } from "@/components/relays/share-bar";
import { StatCard } from "@/components/explorer/stat-card";
import { SectionCard } from "@/components/ui/section-card";
import {
  clientLabel,
  dailyCountPoints,
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
  const hasSeries = satsPoints.length > 0 || countPoints.length > 0;
  const hasParticipants =
    (typeof data?.unique_senders === "number" && data.unique_senders > 0) ||
    (typeof data?.unique_receivers === "number" && data.unique_receivers > 0);
  const hasNutzaps = (nutzapCount ?? 0) > 0 || (nutzapSats ?? 0) > 0;
  if (!hasSeries && !hasParticipants && !hasNutzaps && histogram.length === 0) return null;
  const range = formatStatsWindowLength(window);

  return (
    <SectionCard id="zaps" title="Zaps" description={`Zap receipts over the last ${range}.`}>
      {hasParticipants || hasNutzaps || (selfZaps ?? 0) > 0 ? (
        <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {typeof data?.unique_senders === "number" ? (
            <StatCard plain label="Unique senders" value={data.unique_senders} />
          ) : null}
          {typeof data?.unique_receivers === "number" ? (
            <StatCard plain label="Unique receivers" value={data.unique_receivers} />
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
        </div>
      ) : null}
      {hasSeries ? (
        <div className="grid gap-8 lg:grid-cols-2">
          {satsPoints.length > 0 ? (
            <div>
              <p className="text-ink-faint mb-2 text-xs">Sats per day</p>
              <BarChart points={satsPoints} label="Sats per day" />
            </div>
          ) : null}
          {countPoints.length > 0 ? (
            <div>
              <p className="text-ink-faint mb-2 text-xs">Zaps per day</p>
              <BarChart points={countPoints} label="Zaps per day" />
            </div>
          ) : null}
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
    typeof data?.active_authors_1d === "number" || typeof data?.active_authors_7d === "number";
  if (points.length === 0 && !hasActive) return null;
  return (
    <SectionCard
      id="accounts"
      title="Accounts"
      description="New authors are first-seen counts over 30 days. Active authors posted in the last 1 day and the last 7 days."
    >
      {hasActive ? (
        <div className="mb-6 grid gap-3 sm:grid-cols-2">
          {typeof data?.active_authors_1d === "number" ? (
            <StatCard plain label="Active authors, 1 day" value={data.active_authors_1d} />
          ) : null}
          {typeof data?.active_authors_7d === "number" ? (
            <StatCard plain label="Active authors, 7 days" value={data.active_authors_7d} />
          ) : null}
        </div>
      ) : null}
      {points.length > 0 ? (
        <div>
          <p className="text-ink-faint mb-2 text-xs">New authors per day</p>
          <BarChart points={points} label="New authors per day" />
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
