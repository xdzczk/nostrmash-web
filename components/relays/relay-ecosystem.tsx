import { ShareBar } from "@/components/relays/share-bar";
import { RelayLink } from "@/components/relays/relay-link";
import { normalizeRelayHost } from "@/components/explorer/stats-utils";
import { SectionCard } from "@/components/ui/section-card";
import { formatLatencyMs, formatUnitShare } from "@/lib/stats/ecosystem-display";
import { formatCompletedDayWindow, type StatsWindow } from "@/lib/search-params/window";
import type { RelayOverlapResponse, RelayPropagationResponse } from "@/lib/types/api";

const PROPAGATION_LIMIT = 40;
const OVERLAP_LIMIT = 24;

function Metric({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div>
      <dt className="text-ink-faint text-xs">{label}</dt>
      <dd className="text-ink mt-0.5 text-sm font-medium tabular-nums">{value}</dd>
    </div>
  );
}

function RelayName({ url, window }: { url: string; window: StatsWindow }) {
  const host = normalizeRelayHost(url);
  if (!host) return <span className="text-ink text-sm font-medium">{url}</span>;
  return <RelayLink host={host} window={window} />;
}

function heatClass(jaccard: number | undefined): string {
  if (typeof jaccard !== "number") return "";
  if (jaccard >= 0.75) return "bg-accent/20";
  if (jaccard >= 0.4) return "bg-accent/10";
  if (jaccard >= 0.15) return "bg-accent/5";
  return "";
}

export function RelayPropagationSection({
  data,
  window,
}: {
  data: RelayPropagationResponse | null;
  window: StatsWindow;
}) {
  const relays = data?.relays ?? [];
  if (relays.length === 0) return null;
  const shown = relays.slice(0, PROPAGATION_LIMIT);
  const range = formatCompletedDayWindow(window);
  return (
    <SectionCard
      id="propagation"
      title="Propagation"
      description={`${range}. First-seen share, exclusive share, p50 latency, and untrusted share for each relay.`}
    >
      <ul className="divide-edge/70 divide-y">
        {shown.map((relay) => (
          <li key={relay.relay_url} className="py-3">
            <RelayName url={relay.relay_url} window={window} />
            <dl className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-5">
              <Metric
                label="Events"
                value={
                  typeof relay.events_seen === "number" ? relay.events_seen.toLocaleString() : null
                }
              />
              <Metric
                label="First seen"
                value={
                  typeof relay.first_seen_share === "number"
                    ? formatUnitShare(relay.first_seen_share)
                    : null
                }
              />
              <Metric
                label="Exclusive"
                value={
                  typeof relay.exclusive_share === "number"
                    ? formatUnitShare(relay.exclusive_share)
                    : null
                }
              />
              <Metric
                label="p50 latency"
                value={
                  typeof relay.latency_p50_ms === "number"
                    ? formatLatencyMs(relay.latency_p50_ms)
                    : null
                }
              />
              <Metric
                label="Untrusted"
                value={
                  typeof relay.untrusted_share === "number"
                    ? formatUnitShare(relay.untrusted_share)
                    : null
                }
              />
            </dl>
          </li>
        ))}
      </ul>
      {relays.length > shown.length ? (
        <p className="text-ink-faint mt-3 text-xs">
          Showing {shown.length.toLocaleString()} of {relays.length.toLocaleString()} relays.
        </p>
      ) : null}
    </SectionCard>
  );
}

export function RelayOverlapSection({
  data,
  window,
}: {
  data: RelayOverlapResponse | null;
  window: StatsWindow;
}) {
  const pairs = data?.pairs ?? [];
  if (pairs.length === 0) return null;
  const shown = pairs.slice(0, OVERLAP_LIMIT);
  const range = formatCompletedDayWindow(window);
  return (
    <SectionCard
      id="overlap"
      title="Overlap"
      description={`${range}. Relay pairs ordered by shared events.`}
    >
      <ul className="divide-edge/70 divide-y">
        {shown.map((pair) => {
          const shared =
            typeof pair.shared_events === "number"
              ? `${pair.shared_events.toLocaleString()} shared events`
              : null;
          const jaccard =
            typeof pair.jaccard === "number" ? `Jaccard ${formatUnitShare(pair.jaccard)}` : null;
          const detail = [shared, jaccard].filter((part): part is string => Boolean(part));
          return (
            <li
              key={`${pair.relay_a}|${pair.relay_b}`}
              className={`rounded-md px-2 py-3 ${heatClass(pair.jaccard)}`}
            >
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <RelayName url={pair.relay_a} window={window} />
                <span aria-hidden className="text-ink-faint">
                  ·
                </span>
                <RelayName url={pair.relay_b} window={window} />
              </div>
              {detail.length > 0 ? (
                <p className="text-ink-muted mt-1 text-sm">{detail.join(" · ")}</p>
              ) : null}
              {typeof pair.jaccard === "number" ? (
                <ShareBar
                  value={pair.jaccard}
                  max={1}
                  label={`Jaccard ${formatUnitShare(pair.jaccard)}`}
                />
              ) : null}
            </li>
          );
        })}
      </ul>
      {pairs.length > shown.length ? (
        <p className="text-ink-faint mt-3 text-xs">
          Showing {shown.length.toLocaleString()} of {pairs.length.toLocaleString()} pairs.
        </p>
      ) : null}
    </SectionCard>
  );
}
