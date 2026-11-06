import { formatCompactNumber } from "@/components/explorer/utils";
import { formatBasisPointsAsPercent, formatLatencyMs } from "@/lib/stats/ecosystem-display";
import { formatStatsWindowSpan, type StatsWindow } from "@/lib/search-params/window";
import type { AccountStatsResponse, ZapStatsResponse } from "@/lib/types/api";
import type {
  GroupStatsResponse,
  KindStatsResponse,
  ModerationStatsResponse,
} from "@/lib/types/surfaces";

function percent(part: number, total: number): string {
  if (total <= 0) return "0";
  return ((part / total) * 100).toLocaleString(undefined, { maximumFractionDigits: 0 });
}

export function activityHeadline(data: KindStatsResponse | null, window: StatsWindow): string {
  const families = data?.families ?? [];
  const total = families.reduce((sum, family) => sum + (family.event_count ?? 0), 0);
  const kind1 = families.flatMap((family) => family.kinds ?? []).find((kind) => kind.kind === 1);
  const notes = kind1?.event_count ?? 0;
  if (total <= 0) return "Kind totals for this window are still collecting.";
  return `Kind 1 notes were ${percent(notes, total)}% of indexed events ${formatStatsWindowSpan(window)}.`;
}

export function zapsHeadline(data: ZapStatsResponse | null, window: StatsWindow): string {
  const senders = data?.unique_senders;
  const receivers = data?.unique_receivers;
  const sats = (data?.series ?? []).reduce((sum, day) => sum + (day.sats_total ?? 0), 0);
  const latest = [...(data?.series ?? [])]
    .reverse()
    .find((day) => typeof day.amount_p50_sats === "number");
  if (typeof senders !== "number" || typeof receivers !== "number" || sats <= 0) {
    return "Zap totals for this window are still collecting.";
  }
  const median =
    typeof latest?.amount_p50_sats === "number"
      ? `; the median zap was ${formatCompactNumber(latest.amount_p50_sats)} sats`
      : "";
  return `${formatCompactNumber(senders)} people zapped ${formatCompactNumber(receivers)} people ${formatCompactNumber(sats)} sats ${formatStatsWindowSpan(window)}${median}.`;
}

export function moderationHeadline(data: ModerationStatsResponse | null): string {
  const volume = data?.volume ?? [];
  if (volume.length === 0) return "Report totals are still collecting.";
  const latestDay = volume.reduce(
    (latest, row) => (row.day > latest ? row.day : latest),
    volume[0]!.day
  );
  const rows = volume.filter((row) => row.day === latestDay);
  const reports = rows.reduce((sum, row) => sum + (row.count ?? 0), 0);
  const spam = rows
    .filter((row) => (row.report_type ?? "").toLowerCase() === "spam")
    .reduce((sum, row) => sum + (row.count ?? 0), 0);
  const yesterday = new Date();
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  const when = latestDay === yesterday.toISOString().slice(0, 10) ? "yesterday" : `on ${latestDay}`;
  return `${reports.toLocaleString()} reports were filed ${when}, ${percent(spam, reports)}% of them for spam.`;
}

export function peopleHeadline(data: AccountStatsResponse | null): string {
  const active = data?.active_authors_1d;
  const newest = data?.new_authors?.at(-1);
  const created = newest && "count" in newest ? newest.count : undefined;
  if (typeof active !== "number") return "Account totals are still collecting.";
  const fresh =
    typeof created === "number"
      ? `; ${created.toLocaleString()} accounts were first seen on the latest day`
      : "";
  return `${formatCompactNumber(active)} people posted in the last day${fresh}.`;
}

export function relaysHeadline(indexed: number | null, window: StatsWindow): string {
  if (indexed === null) return "Relay totals for this window are still collecting.";
  return `${formatCompactNumber(indexed)} relays delivered events ${formatStatsWindowSpan(window)}.`;
}

export function communitiesHeadline(data: GroupStatsResponse | null): string {
  if (typeof data?.groups !== "number") return "Group totals are still collecting.";
  const active =
    typeof data.active_groups_1d === "number"
      ? `; ${data.active_groups_1d.toLocaleString()} posted in the last day`
      : "";
  const indexed =
    data.groups === 1
      ? "1 group is indexed"
      : `${formatCompactNumber(data.groups)} groups are indexed`;
  return `${indexed}${active}.`;
}

export function concentrationCaption(): string {
  return "How uneven zap sizes are. 0% means every zap was the same size; 100% means one zap was the whole total.";
}

export function formatZapLatency(seconds: number): string {
  return formatLatencyMs(seconds * 1000);
}

export function formatShareBps(bps: number): string {
  return formatBasisPointsAsPercent(bps);
}
