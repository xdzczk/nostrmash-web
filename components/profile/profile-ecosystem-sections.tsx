import { BarChart } from "@/components/charts/bar-chart";
import { WindowSelector } from "@/components/explorer/window-selector";
import { Pill } from "@/components/ui/pill";
import { SectionCard } from "@/components/ui/section-card";
import { ErrorPanel } from "@/components/ui/status-panels";
import { StatCard } from "@/components/explorer/stat-card";
import {
  getAuthorAnalyticsSummary,
  getAuthorZapAnalytics,
  getProfileIdentity,
} from "@/lib/api/endpoints";
import { toUserFacingErrorMessage } from "@/lib/errors/user-message";
import { analyticsWindowLabel, visibleIdentityFields } from "@/lib/profile/identity-display";
import { readSearchParam, toUrlSearchParams } from "@/lib/search-params/pagination";
import {
  STATS_WINDOWS,
  formatStatsWindowLength,
  isStatsWindow,
  type StatsWindow,
} from "@/lib/search-params/window";
import { dailyCountPoints, formatRate, sumOptional } from "@/lib/stats/ecosystem-display";
import type { AuthorZapAnalytics, ProfileIdentity } from "@/lib/types/api";

const PROFILE_ZAP_WINDOW: StatsWindow = "7d";

function readProfileZapWindow(
  searchParams: Record<string, string | string[] | undefined>
): StatsWindow {
  const value = readSearchParam(searchParams, "window");
  return isStatsWindow(value) ? value : PROFILE_ZAP_WINDOW;
}

function Nip05Hint({ hint }: { hint?: "verified" | "unverified" | "unreachable" | "blocked" }) {
  if (hint === "verified") return <Pill tone="entity">Verified</Pill>;
  if (hint === "unverified") return <span className="text-ink-faint text-xs">Unverified</span>;
  if (hint === "unreachable") return <span className="text-ink-faint text-xs">Unreachable</span>;
  if (hint === "blocked") return <span className="text-ink-faint text-xs">Blocked</span>;
  return null;
}

export async function ProfileIdentitySection({ pubkey }: { pubkey: string }) {
  let identity: ProfileIdentity | null = null;
  let errorMessage = "";
  try {
    identity = await getProfileIdentity(pubkey, "requestTime");
  } catch (error) {
    errorMessage = toUserFacingErrorMessage(error, "Identity data is unavailable.");
  }
  if (errorMessage) return <ErrorPanel message={errorMessage} />;
  if (!identity) return null;
  const fields = visibleIdentityFields(identity);
  if (fields.length === 0) return null;
  return (
    <SectionCard id="profile-identity" title="Identity">
      <dl className="grid gap-3 sm:grid-cols-2">
        {fields.map((field) => (
          <div key={field.label} className="min-w-0">
            <dt className="text-ink-faint text-xs">{field.label}</dt>
            <dd className="text-ink mt-1 flex flex-wrap items-center gap-2 text-sm break-all">
              {field.value ? <span>{field.value}</span> : null}
              <Nip05Hint hint={field.hint} />
            </dd>
          </div>
        ))}
      </dl>
    </SectionCard>
  );
}

export async function ProfileEngagementSection({ pubkey }: { pubkey: string }) {
  let rows: Array<{ key: string; label: string; value: string }> = [];
  let errorMessage = "";
  try {
    const summary = await getAuthorAnalyticsSummary(pubkey, "requestTime");
    rows = (summary.windows ?? []).flatMap((window) => {
      if (typeof window.engagement_rate_per_post !== "number") return [];
      return [
        {
          key: window.window ?? `rate-${window.engagement_rate_per_post}`,
          label: analyticsWindowLabel(window.window),
          value: formatRate(window.engagement_rate_per_post),
        },
      ];
    });
  } catch (error) {
    errorMessage = toUserFacingErrorMessage(error, "Engagement data is unavailable.");
  }
  if (errorMessage) return <ErrorPanel message={errorMessage} />;
  if (rows.length === 0) return null;
  return (
    <SectionCard id="engagement-rate" title="Engagement per post">
      <ul className="divide-edge/70 divide-y">
        {rows.map((row) => (
          <li key={row.key} className="flex items-baseline justify-between gap-4 py-2">
            <span className="text-ink-soft text-sm">{row.label}</span>
            <span className="text-ink text-sm font-medium tabular-nums">{row.value}</span>
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}

function zapSectionHasContent(data: AuthorZapAnalytics): boolean {
  const series = data.series ?? [];
  const hasDay = series.some((day) =>
    [
      day.received_count,
      day.received_sats,
      day.sent_count,
      day.sent_sats,
      day.nutzap_received_count,
      day.nutzap_received_sats,
    ].some((value) => typeof value === "number" && value > 0)
  );
  if (hasDay) return true;
  return [data.inbound_zaps, data.inbound_sats, data.repeat_zappers].some(
    (value) => typeof value === "number" && value > 0
  );
}

export async function ProfileZapAnalyticsSection({
  pubkey,
  route,
  searchParams,
}: {
  pubkey: string;
  route: string;
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const requestedWindow = readSearchParam(searchParams, "window");
  const window = readProfileZapWindow(searchParams);
  let data: AuthorZapAnalytics | null = null;
  let errorMessage = "";
  try {
    data = await getAuthorZapAnalytics(pubkey, "requestTime", window);
  } catch (error) {
    errorMessage = toUserFacingErrorMessage(error, "Zap analytics are unavailable.");
  }
  if (errorMessage) return <ErrorPanel message={errorMessage} />;
  if (!data || (!zapSectionHasContent(data) && !isStatsWindow(requestedWindow))) return null;
  const series = data.series ?? [];
  const receivedSats = dailyCountPoints(series, (day) =>
    "received_sats" in day ? day.received_sats : undefined
  );
  const sentSats = dailyCountPoints(series, (day) =>
    "sent_sats" in day ? day.sent_sats : undefined
  );
  const nutzapCount = sumOptional(series.map((day) => day.nutzap_received_count));
  const nutzapSats = sumOptional(series.map((day) => day.nutzap_received_sats));
  const current = toUrlSearchParams(searchParams);

  return (
    <SectionCard
      id="zap-analytics"
      title="Zaps"
      description={`Received and sent sats over the last ${formatStatsWindowLength(window)}. Inbound totals count every zap on record.`}
    >
      <WindowSelector
        path={route}
        searchParams={current}
        activeWindow={window}
        windows={STATS_WINDOWS}
        defaultWindow={PROFILE_ZAP_WINDOW}
        ariaLabel="Zap window"
      />
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {typeof data.inbound_zaps === "number" && data.inbound_zaps > 0 ? (
          <StatCard plain label="Lifetime inbound zaps" value={data.inbound_zaps} />
        ) : null}
        {typeof data.inbound_sats === "number" && data.inbound_sats > 0 ? (
          <StatCard plain label="Lifetime inbound sats" value={data.inbound_sats} />
        ) : null}
        {typeof data.repeat_zappers === "number" && data.repeat_zappers > 0 ? (
          <StatCard plain label="Repeat zappers" value={data.repeat_zappers} />
        ) : null}
        {nutzapCount !== null && nutzapCount > 0 ? (
          <StatCard plain label="Nutzaps received" value={nutzapCount} />
        ) : null}
        {nutzapSats !== null && nutzapSats > 0 ? (
          <StatCard plain label="Nutzap sats received" value={nutzapSats} />
        ) : null}
      </div>
      {receivedSats.length > 0 || sentSats.length > 0 ? (
        <div className="mt-6 grid gap-8 lg:grid-cols-2">
          {receivedSats.length > 0 ? (
            <div>
              <p className="text-ink-faint mb-2 text-xs">Sats received per day</p>
              <BarChart points={receivedSats} label="Sats received per day" />
            </div>
          ) : null}
          {sentSats.length > 0 ? (
            <div>
              <p className="text-ink-faint mb-2 text-xs">Sats sent per day</p>
              <BarChart points={sentSats} label="Sats sent per day" />
            </div>
          ) : null}
        </div>
      ) : null}
    </SectionCard>
  );
}
