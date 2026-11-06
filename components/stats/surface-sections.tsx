import Link from "@/components/app-link";

import type { SeriesPoint } from "@/components/charts/sparkline";
import { BarSeries } from "@/components/stats/bar-series";
import { KindFamilyList } from "@/components/stats/kind-family-list";
import { AdjacentValue, RankedList } from "@/components/stats/ranked-list";
import { SpamClusters } from "@/components/stats/spam-clusters";
import { ProfileChip } from "@/components/explorer/entity-chips";
import { EmptyState } from "@/components/explorer/empty-state";
import { StatCard, StatGrid } from "@/components/explorer/stat-card";
import { ShareBar } from "@/components/relays/share-bar";
import { SectionCard } from "@/components/ui/section-card";
import {
  dailyCountPoints,
  formatBasisPointsAsPercent,
  formatLatencyMs,
} from "@/lib/stats/ecosystem-display";
import {
  ACCOUNT_AGE_LABELS,
  CONTENT_LENGTH_LABELS,
  GROUP_SIZE_LABELS,
  SERIES_EMPTY_MESSAGE,
  WEEKDAY_LABELS,
  accountAgeLabel,
  formatDurationSeconds,
  formatScaledHundredths,
  momentumLabel,
  weekdayLabel,
} from "@/lib/stats/surface-display";
import type { StatsWindow } from "@/lib/search-params/window";
import { formatStatsWindowLength } from "@/lib/search-params/window";
import type { Profile } from "@/lib/types/api";
import { CONTENT_LENGTH_BUCKETS } from "@/lib/types/surfaces";
import type {
  AccountAgeBucket,
  ContentShapeStats,
  ConversationStatsResponse,
  DeletionStatsResponse,
  EmojiStatsResponse,
  GroupStatsResponse,
  HashtagHistoryResponse,
  HashtagMomentum,
  KindStatsResponse,
  LabelStatsResponse,
  MediaHostStatsResponse,
  ModerationStatsResponse,
  RelayHealthHistoryResponse,
  RelayListStatsResponse,
  RelaySoftwareStatsResponse,
  SpamStatsResponse,
  ZapHeatmapResponse,
  ZapLeaderboardItem,
  ZapLeaderboardRole,
} from "@/lib/types/surfaces";

function ChartOrEmpty({
  points,
  label,
  message = SERIES_EMPTY_MESSAGE,
}: {
  points: SeriesPoint[];
  label: string;
  message?: string;
}) {
  return <BarSeries points={points} label={label} empty={message} />;
}

export function GroupStatsSection({ data }: { data: GroupStatsResponse | null }) {
  const series = data?.series ?? [];
  const histogram = data?.size_histogram ?? [];
  const messages = dailyCountPoints(series, (day) => day.messages);
  const active = dailyCountPoints(series, (day) => day.active_groups);
  const hasCards =
    typeof data?.groups === "number" ||
    typeof data?.active_groups_1d === "number" ||
    typeof data?.active_groups_7d === "number" ||
    typeof data?.messages_1d === "number";
  return (
    <SectionCard
      id="groups"
      title="Groups"
      description="Group messages and groups that posted, by UTC day."
    >
      {hasCards ? (
        <StatGrid>
          {typeof data?.groups === "number" ? (
            <StatCard
              plain
              label="Groups"
              value={data.groups}
              description="Groups this index has seen."
            />
          ) : null}
          {typeof data?.active_groups_1d === "number" ? (
            <StatCard
              plain
              label="Active, 1 day"
              value={data.active_groups_1d}
              description="Groups with a message in the last day."
            />
          ) : null}
          {typeof data?.active_groups_7d === "number" ? (
            <StatCard
              plain
              label="Active, 7 days"
              value={data.active_groups_7d}
              description="Groups with a message in the last 7 days."
            />
          ) : null}
          {typeof data?.messages_1d === "number" ? (
            <StatCard
              plain
              label="Messages, 1 day"
              value={data.messages_1d}
              description="Group messages indexed in the last day."
            />
          ) : null}
        </StatGrid>
      ) : null}
      {messages.length === 0 && active.length === 0 ? (
        <EmptyState message={SERIES_EMPTY_MESSAGE} />
      ) : (
        <div className="grid gap-8 lg:grid-cols-2">
          <ChartOrEmpty points={messages} label="Messages per day" />
          <ChartOrEmpty points={active} label="Active groups per day" />
        </div>
      )}
      {histogram.length > 0 ? (
        <ul className="mt-6 space-y-2">
          {histogram.map((bucket) => (
            <li key={bucket.members}>
              <AdjacentValue
                label={GROUP_SIZE_LABELS[bucket.members] ?? bucket.members}
                value={(bucket.groups ?? 0).toLocaleString()}
              />
            </li>
          ))}
        </ul>
      ) : null}
      <p className="mt-4">
        <Link href="/groups" className="text-link text-sm">
          Browse groups
        </Link>
      </p>
    </SectionCard>
  );
}

export function KindStatsSection({
  data,
  window,
}: {
  data: KindStatsResponse | null;
  window: StatsWindow;
}) {
  const families = [...(data?.families ?? [])].sort(
    (left, right) => (right.event_count ?? 0) - (left.event_count ?? 0)
  );
  return (
    <SectionCard
      id="kinds"
      title="Kinds"
      description={`Event kinds over the last ${formatStatsWindowLength(window)}, including kinds that only appear in the census.`}
    >
      {families.length === 0 ? (
        <EmptyState message="No kind totals are recorded for this window yet." />
      ) : (
        <KindFamilyList families={families} />
      )}
    </SectionCard>
  );
}

export function ConversationStatsSection({ data }: { data: ConversationStatsResponse | null }) {
  const series = data?.series ?? [];
  const threads = dailyCountPoints(series, (day) => day.threads);
  const latency = dailyCountPoints(series, (day) => day.p50_first_reply_s);
  const latest = series.at(-1);
  return (
    <SectionCard
      id="conversations"
      title="Conversations"
      description="Direct replies, how long the first reply took, and how threads branch."
    >
      {series.length === 0 ? (
        <EmptyState message={SERIES_EMPTY_MESSAGE} />
      ) : (
        <div className="space-y-6">
          <div className="grid gap-3 sm:grid-cols-2">
            {typeof latest?.avg_depth_x100 === "number" ? (
              <StatCard
                plain
                label="Average depth, latest day"
                value={formatScaledHundredths(latest.avg_depth_x100)}
              />
            ) : null}
            {typeof latest?.avg_branching_x100 === "number" ? (
              <StatCard
                plain
                label="Average branching, latest day"
                value={formatScaledHundredths(latest.avg_branching_x100)}
              />
            ) : null}
          </div>
          <div className="grid gap-8 lg:grid-cols-2">
            <ChartOrEmpty points={threads} label="Threads per day" />
            <ChartOrEmpty points={latency} label="Median seconds to first reply" />
          </div>
        </div>
      )}
    </SectionCard>
  );
}

export function DeletionStatsSection({ data }: { data: DeletionStatsResponse | null }) {
  const items = data?.items ?? [];
  return (
    <SectionCard
      id="deletions"
      title="Deletions"
      description="Deletes by day and kind, with median time to delete."
    >
      {items.length === 0 ? (
        <EmptyState message={SERIES_EMPTY_MESSAGE} />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-ink-faint text-xs">
                <th className="py-2 pr-4 font-medium">Day</th>
                <th className="py-2 pr-4 font-medium">Kind</th>
                <th className="py-2 pr-4 font-medium">Deletes</th>
                <th className="py-2 font-medium">Median time</th>
              </tr>
            </thead>
            <tbody>
              {items.map((row) => (
                <tr key={`${row.day}-${row.kind ?? "any"}`} className="border-edge/60 border-t">
                  <td className="py-2 pr-4 tabular-nums">{row.day}</td>
                  <td className="py-2 pr-4 tabular-nums">{row.kind ?? "—"}</td>
                  <td className="py-2 pr-4 tabular-nums">{(row.count ?? 0).toLocaleString()}</td>
                  <td className="py-2 tabular-nums">
                    {typeof row.p50_time_to_delete_s === "number"
                      ? formatDurationSeconds(row.p50_time_to_delete_s)
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </SectionCard>
  );
}

const REPORT_TYPES = ["spam", "illegal", "nudity", "impersonation", "malware", "other"] as const;

function reportBucket(type: string | undefined): (typeof REPORT_TYPES)[number] {
  const key = (type ?? "other").toLowerCase();
  return (REPORT_TYPES as readonly string[]).includes(key)
    ? (key as (typeof REPORT_TYPES)[number])
    : "other";
}

function reportSeries(
  volume: Array<{ day: string; report_type?: string; count?: number }>,
  type: (typeof REPORT_TYPES)[number]
) {
  const byDay = new Map<string, number>();
  for (const row of volume) {
    if (reportBucket(row.report_type) !== type) continue;
    byDay.set(row.day, (byDay.get(row.day) ?? 0) + (row.count ?? 0));
  }
  return dailyCountPoints(
    [...byDay.entries()].map(([day, count]) => ({ day, count })),
    (row) => row.count
  );
}

export function ModerationStatsSection({
  data,
  profiles = {},
}: {
  data: ModerationStatsResponse | null;
  profiles?: Record<string, Profile>;
}) {
  const volume = data?.volume ?? [];
  const reported = data?.most_reported ?? [];
  if (volume.length === 0 && reported.length === 0) {
    return (
      <SectionCard
        id="moderation"
        title="Moderation"
        description="Reports by day and the targets reported most often."
      >
        <EmptyState message={SERIES_EMPTY_MESSAGE} />
      </SectionCard>
    );
  }
  const series = REPORT_TYPES.flatMap((type) => {
    const points = reportSeries(volume, type);
    return points.length > 0 ? [{ type, points }] : [];
  });
  return (
    <SectionCard
      id="moderation"
      title="Moderation"
      description="Reports by day and the targets reported most often."
    >
      {series.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2">
          {series.map((entry) => (
            <ChartOrEmpty
              key={entry.type}
              points={entry.points}
              label={`${entry.type[0]!.toUpperCase()}${entry.type.slice(1)} reports per day`}
            />
          ))}
        </div>
      ) : null}
      {reported.length > 0 ? (
        <div className="mt-6">
          <h3 className="text-ink mb-2 text-sm font-medium">Most reported</h3>
          <RankedList
            items={reported.map((target) => {
              const type = (target.target_type ?? "").toLowerCase();
              const reports = target.report_count ?? 0;
              const people = target.reporter_count;
              const entity =
                type === "p" || type === "pubkey" ? (
                  <ProfileChip
                    pubkey={target.target_value}
                    profile={profiles[target.target_value.toLowerCase()]}
                  />
                ) : type === "e" || type === "event" ? (
                  <Link
                    href={`/notes/${encodeURIComponent(target.target_value)}`}
                    className="text-link text-sm"
                  >
                    Note
                  </Link>
                ) : (
                  <span className="text-ink text-sm break-all">{target.target_value}</span>
                );
              return {
                id: `${type}-${target.target_value}`,
                amount: reports,
                entity,
                value:
                  typeof people === "number"
                    ? `${reports.toLocaleString()} reports from ${people.toLocaleString()} people`
                    : `${reports.toLocaleString()} reports`,
              };
            })}
          />
        </div>
      ) : null}
    </SectionCard>
  );
}

export function SpamStatsSection({
  data,
  profiles = {},
}: {
  data: SpamStatsResponse | null;
  profiles?: Record<string, Profile>;
}) {
  const clusters = data?.duplicate_clusters ?? [];
  const authors = data?.burst_authors ?? [];
  return (
    <SectionCard
      id="spam"
      title="Spam"
      description="Repeated content fingerprints and authors posting in a burst."
    >
      {clusters.length === 0 && authors.length === 0 ? (
        <EmptyState message="No duplicate clusters or burst authors are recorded yet." />
      ) : (
        <div className="grid gap-8 lg:grid-cols-2">
          <div>
            <h3 className="text-ink mb-2 text-sm font-medium">Duplicate clusters</h3>
            {clusters.length === 0 ? (
              <EmptyState message="No duplicate content clusters are recorded yet." />
            ) : (
              <SpamClusters clusters={clusters} />
            )}
          </div>
          <div>
            <h3 className="text-ink mb-2 text-sm font-medium">Burst authors</h3>
            {authors.length === 0 ? (
              <EmptyState message="No burst authors are recorded yet." />
            ) : (
              <RankedList
                items={authors.map((author) => ({
                  id: `${author.pubkey}-${author.day ?? ""}-${author.hour ?? ""}`,
                  amount: author.post_count ?? 0,
                  entity: (
                    <ProfileChip
                      pubkey={author.pubkey}
                      profile={profiles[author.pubkey.toLowerCase()]}
                    />
                  ),
                  value: `${(author.post_count ?? 0).toLocaleString()} posts/hour`,
                }))}
              />
            )}
          </div>
        </div>
      )}
    </SectionCard>
  );
}

export function ContentShapeSection({ data }: { data: ContentShapeStats }) {
  const rows = data.rows ?? [];
  const engagement = data.engagement_by_kind ?? [];
  const buckets = data.length_buckets;
  const bucketEntries = CONTENT_LENGTH_BUCKETS.flatMap((key) => {
    const count = buckets?.[key];
    return typeof count === "number" ? [{ key, count }] : [];
  });
  const empty = rows.length === 0 && engagement.length === 0 && bucketEntries.length === 0;
  return (
    <SectionCard
      id="content-shape"
      title="Content shape"
      description="Posts, mentions, hashtags, and engagement by kind. Length buckets appear when the rollup includes them."
    >
      {empty ? (
        <EmptyState message={SERIES_EMPTY_MESSAGE} />
      ) : (
        <div className="space-y-6">
          {bucketEntries.length > 0 ? (
            <ul className="space-y-2">
              {bucketEntries.map((bucket) => (
                <li key={bucket.key} className="flex justify-between gap-4 text-sm">
                  <span className="text-ink-soft">{CONTENT_LENGTH_LABELS[bucket.key]}</span>
                  <span className="text-ink tabular-nums">{bucket.count.toLocaleString()}</span>
                </li>
              ))}
            </ul>
          ) : null}
          {typeof data.mention_total === "number" ? (
            <StatCard plain label="Mentions" value={data.mention_total} />
          ) : null}
          {rows.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-ink-faint text-xs">
                    <th className="py-2 pr-4 font-medium">Kind</th>
                    <th className="py-2 pr-4 font-medium">Posts</th>
                    <th className="py-2 pr-4 font-medium">Mentions</th>
                    <th className="py-2 font-medium">Hashtags</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.kind} className="border-edge/60 border-t">
                      <td className="py-2 pr-4 tabular-nums">{row.kind}</td>
                      <td className="py-2 pr-4 tabular-nums">
                        {(row.posts ?? 0).toLocaleString()}
                      </td>
                      <td className="py-2 pr-4 tabular-nums">
                        {(row.mentions ?? 0).toLocaleString()}
                      </td>
                      <td className="py-2 tabular-nums">{(row.hashtags ?? 0).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
          {engagement.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-ink-faint text-xs">
                    <th className="py-2 pr-4 font-medium">Kind</th>
                    <th className="py-2 pr-4 font-medium">Posts</th>
                    <th className="py-2 pr-4 font-medium">Reactions</th>
                    <th className="py-2 pr-4 font-medium">Replies</th>
                    <th className="py-2 font-medium">Zaps</th>
                  </tr>
                </thead>
                <tbody>
                  {engagement.map((row) => (
                    <tr key={row.kind} className="border-edge/60 border-t">
                      <td className="py-2 pr-4 tabular-nums">{row.kind}</td>
                      <td className="py-2 pr-4 tabular-nums">
                        {(row.posts ?? 0).toLocaleString()}
                      </td>
                      <td className="py-2 pr-4 tabular-nums">
                        {(row.reactions ?? 0).toLocaleString()}
                      </td>
                      <td className="py-2 pr-4 tabular-nums">
                        {(row.replies ?? 0).toLocaleString()}
                      </td>
                      <td className="py-2 tabular-nums">{(row.zaps ?? 0).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      )}
    </SectionCard>
  );
}

export function LabelStatsSection({ data }: { data: LabelStatsResponse | null }) {
  const labels = data?.labels ?? [];
  const agreement = data?.language_agreement;
  return (
    <SectionCard
      id="labels"
      title="Labels"
      description="NIP-32 labels and how often language labels agree."
    >
      {labels.length === 0 && !agreement ? (
        <EmptyState message="No label totals are recorded yet." />
      ) : (
        <div className="space-y-4">
          {agreement ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {typeof agreement.agree === "number" ? (
                <StatCard plain label="Language labels agree" value={agreement.agree} />
              ) : null}
              {typeof agreement.disagree === "number" ? (
                <StatCard plain label="Language labels disagree" value={agreement.disagree} />
              ) : null}
            </div>
          ) : null}
          {labels.length > 0 ? (
            <ul className="space-y-1 text-sm">
              {labels.slice(0, 40).map((label) => (
                <li
                  key={`${label.namespace}-${label.label}`}
                  className="flex justify-between gap-4"
                >
                  <span className="text-ink-soft min-w-0 break-all">
                    {label.namespace ? `${label.namespace} / ` : ""}
                    {label.label}
                  </span>
                  <span className="text-ink shrink-0 tabular-nums">
                    {(label.count ?? 0).toLocaleString()}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      )}
    </SectionCard>
  );
}

export function EmojiStatsSection({
  data,
  window,
}: {
  data: EmojiStatsResponse | null;
  window: StatsWindow;
}) {
  const emoji = data?.emoji ?? [];
  const max = Math.max(...emoji.map((entry) => entry.count ?? 0), 1);
  return (
    <SectionCard
      id="emoji"
      title="Emoji"
      description={`Custom emoji over the last ${formatStatsWindowLength(window)}.`}
    >
      {emoji.length === 0 ? (
        <EmptyState message="No custom emoji counts are recorded for this window yet." />
      ) : (
        <ul className="space-y-3">
          {emoji.slice(0, 24).map((entry) => (
            <li key={entry.shortcode}>
              <div className="flex justify-between gap-4 text-sm">
                <span className="text-ink min-w-0 break-all">:{entry.shortcode}:</span>
                <span className="shrink-0 tabular-nums">{(entry.count ?? 0).toLocaleString()}</span>
              </div>
              <ShareBar
                value={entry.count ?? 0}
                max={max}
                label={`${entry.shortcode}, ${(entry.count ?? 0).toLocaleString()}`}
              />
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}

export function MediaHostStatsSection({ data }: { data: MediaHostStatsResponse | null }) {
  const observed = data?.observed ?? [];
  const servers = data?.blossom_servers ?? [];
  return (
    <SectionCard
      id="media-hosts"
      title="Media hosts"
      description="Domains that hosted media, and Blossom servers authors listed."
    >
      {observed.length === 0 && servers.length === 0 ? (
        <EmptyState message="No media hosts are recorded yet." />
      ) : (
        <div className="grid gap-8 lg:grid-cols-2">
          <ul className="space-y-2 text-sm">
            {observed.map((host) => (
              <li key={host.canonical_domain} className="flex justify-between gap-4">
                <span className="text-ink min-w-0 break-all">{host.canonical_domain}</span>
                <span className="text-ink-muted shrink-0 tabular-nums">
                  {(host.media_count ?? 0).toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
          <ul className="space-y-2 text-sm">
            {servers.map((server) => (
              <li key={server.server} className="flex justify-between gap-4">
                <span className="text-ink min-w-0 break-all">{server.server}</span>
                <span className="text-ink-muted shrink-0 tabular-nums">
                  {(server.pubkeys ?? 0).toLocaleString()} pubkeys
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </SectionCard>
  );
}

export function RelaySoftwareSection({ data }: { data: RelaySoftwareStatsResponse | null }) {
  const software = data?.software ?? [];
  const max = Math.max(...software.map((entry) => entry.relays ?? 0), 1);
  const hasShares =
    typeof data?.auth_required_share_bps === "number" ||
    typeof data?.payment_required_share_bps === "number";
  return (
    <SectionCard
      id="relay-software"
      title="Relay software"
      description="Software names relays published, plus auth and payment requirements."
    >
      {!hasShares && software.length === 0 ? (
        <EmptyState message="No relay software distribution is recorded yet." />
      ) : (
        <div className="space-y-4">
          {hasShares ? (
            <StatGrid>
              {typeof data?.auth_required_share_bps === "number" ? (
                <StatCard
                  plain
                  label="Auth required"
                  value={formatBasisPointsAsPercent(data.auth_required_share_bps)}
                  description="Share of relays that require authentication."
                />
              ) : null}
              {typeof data?.payment_required_share_bps === "number" ? (
                <StatCard
                  plain
                  label="Payment required"
                  value={formatBasisPointsAsPercent(data.payment_required_share_bps)}
                  description="Share of relays that require payment."
                />
              ) : null}
            </StatGrid>
          ) : null}
          {software.length === 0 ? (
            <EmptyState message="No software names are recorded yet." />
          ) : (
            <ul className="space-y-3">
              {software.map((entry) => (
                <li key={entry.software}>
                  <div className="flex justify-between gap-4 text-sm">
                    <span className="text-ink min-w-0 break-all">{entry.software}</span>
                    <span className="shrink-0 tabular-nums">
                      {(entry.relays ?? 0).toLocaleString()}
                    </span>
                  </div>
                  <ShareBar
                    value={entry.relays ?? 0}
                    max={max}
                    label={`${entry.software}, ${(entry.relays ?? 0).toLocaleString()} relays`}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </SectionCard>
  );
}

export function RelayListStatsSection({ data }: { data: RelayListStatsResponse | null }) {
  const series = data?.series ?? [];
  const lists = dailyCountPoints(series, (day) => day.lists);
  const latest = series.at(-1);
  return (
    <SectionCard
      id="relay-lists"
      title="Relay lists"
      description="NIP-65 relay lists published per day."
    >
      {series.length === 0 ? (
        <EmptyState message={SERIES_EMPTY_MESSAGE} />
      ) : (
        <div className="space-y-6">
          <div className="grid gap-3 sm:grid-cols-2">
            {typeof latest?.avg_relays_x100 === "number" ? (
              <StatCard
                plain
                label="Average relays, latest day"
                value={formatScaledHundredths(latest.avg_relays_x100)}
              />
            ) : null}
            {typeof latest?.p50_relays === "number" ? (
              <StatCard plain label="Median relays, latest day" value={latest.p50_relays} />
            ) : null}
          </div>
          <ChartOrEmpty points={lists} label="Relay lists per day" />
        </div>
      )}
    </SectionCard>
  );
}

export function ZapHeatmapSection({ data }: { data: ZapHeatmapResponse | null }) {
  const cells = data?.cells ?? [];
  if (cells.length === 0) {
    return (
      <SectionCard id="zap-heatmap" title="Zap timing" description="Zaps by weekday and hour, UTC.">
        <EmptyState message={SERIES_EMPTY_MESSAGE} />
      </SectionCard>
    );
  }
  const grid = new Map<string, number>();
  for (const cell of cells) grid.set(`${cell.day_of_week}:${cell.hour}`, cell.zap_count ?? 0);
  const max = Math.max(...cells.map((cell) => cell.zap_count ?? 0), 1);
  return (
    <SectionCard
      id="zap-heatmap"
      title="Zap timing"
      description="Zaps by weekday and hour, UTC. Sunday is the first row."
    >
      <div className="overflow-x-auto">
        <div className="grid min-w-[42rem] grid-cols-[6rem_repeat(24,minmax(0,1fr))] gap-px">
          <span />
          {Array.from({ length: 24 }, (_, hour) => (
            <span key={hour} className="text-ink-faint text-center text-[10px]">
              {hour}
            </span>
          ))}
          {WEEKDAY_LABELS.map((label, day) => (
            <div key={label} className="contents">
              <span className="text-ink-muted pr-2 text-xs">{weekdayLabel(day)}</span>
              {Array.from({ length: 24 }, (_, hour) => {
                const count = grid.get(`${day}:${hour}`) ?? 0;
                const alpha = count === 0 ? 0 : Math.max(count / max, 0.12);
                return (
                  <span
                    key={`${day}-${hour}`}
                    title={`${label} ${hour}:00 UTC, ${count.toLocaleString()} zaps`}
                    className="bg-accent h-4 rounded-sm"
                    style={{ opacity: alpha }}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <p className="text-ink-faint mt-3 flex items-center gap-2 text-xs">
        <span className="bg-accent/15 inline-block h-3 w-6 rounded-sm" />
        Fewer
        <span className="bg-accent inline-block h-3 w-6 rounded-sm" />
        More
        <span>Hours are UTC. Sunday is the first row.</span>
      </p>
    </SectionCard>
  );
}

export function ZapLeaderboardSection({
  items,
  profiles,
  role,
  window,
  searchParams,
}: {
  items: ZapLeaderboardItem[];
  profiles: Record<string, Profile>;
  role: ZapLeaderboardRole;
  window: StatsWindow;
  searchParams: URLSearchParams;
}) {
  const hrefFor = (nextRole: ZapLeaderboardRole) => {
    const next = new URLSearchParams(searchParams);
    next.set("zap_role", nextRole);
    const query = next.toString();
    return query.length > 0 ? `/stats/zaps?${query}` : "/stats/zaps";
  };
  return (
    <SectionCard
      id="zap-leaderboard"
      title="Zap leaderboard"
      description={`Largest ${role === "sender" ? "senders" : "receivers"} over the last ${formatStatsWindowLength(window)}.`}
    >
      <div className="mb-4 flex gap-3 text-sm">
        <Link
          href={hrefFor("receiver")}
          aria-current={role === "receiver" ? "page" : undefined}
          className={role === "receiver" ? "text-ink" : "text-link"}
        >
          Receivers
        </Link>
        <Link
          href={hrefFor("sender")}
          aria-current={role === "sender" ? "page" : undefined}
          className={role === "sender" ? "text-ink" : "text-link"}
        >
          Senders
        </Link>
      </div>
      {items.length === 0 ? (
        <EmptyState message="No zap totals are recorded for this window yet." />
      ) : (
        <RankedList
          items={items.map((item) => {
            const profile = profiles[item.pubkey.toLowerCase()];
            return {
              id: item.pubkey,
              amount: item.sats ?? 0,
              entity: <ProfileChip pubkey={item.pubkey} profile={profile} />,
              value: `${(item.sats ?? 0).toLocaleString()} sats${
                typeof item.zap_count === "number" ? ` · ${item.zap_count.toLocaleString()}` : ""
              }`,
            };
          })}
        />
      )}
    </SectionCard>
  );
}

export function RelayHealthHistorySection({ data }: { data: RelayHealthHistoryResponse | null }) {
  const series = data?.series ?? [];
  const ok = dailyCountPoints(series, (day) =>
    typeof day.connect_ok_bps === "number" ? day.connect_ok_bps / 100 : undefined
  );
  const latency = dailyCountPoints(series, (day) => day.connect_p50_ms);
  return (
    <SectionCard
      id="health-history"
      title="Health history"
      description="Thirty days of probes. Connect success is shown in percent. Latency is milliseconds."
    >
      {series.length === 0 ? (
        <EmptyState message={SERIES_EMPTY_MESSAGE} />
      ) : (
        <div className="grid gap-8 lg:grid-cols-2">
          <ChartOrEmpty points={ok} label="Connect success, percent" />
          <ChartOrEmpty points={latency} label="Connect p50, milliseconds" />
          {typeof series.at(-1)?.connect_p90_ms === "number" ? (
            <p className="text-ink-muted text-sm">
              Latest connect p90 {formatLatencyMs(series.at(-1)?.connect_p90_ms ?? 0)}
              {typeof series.at(-1)?.eose_p50_ms === "number"
                ? ` · EOSE p50 ${formatLatencyMs(series.at(-1)?.eose_p50_ms ?? 0)}`
                : ""}
            </p>
          ) : null}
        </div>
      )}
    </SectionCard>
  );
}

export function HashtagHistorySection({ data }: { data: HashtagHistoryResponse | null }) {
  const series = data?.series ?? [];
  return (
    <SectionCard title="90-day history" description="Daily mentions and authors for this hashtag.">
      {series.length === 0 ? (
        <EmptyState message={SERIES_EMPTY_MESSAGE} />
      ) : (
        <div className="grid gap-8 lg:grid-cols-2">
          <ChartOrEmpty
            points={dailyCountPoints(series, (day) => day.events)}
            label="Mentions per day"
          />
          <ChartOrEmpty
            points={dailyCountPoints(series, (day) => day.authors)}
            label="Authors per day"
          />
        </div>
      )}
    </SectionCard>
  );
}

export function EmergingHashtagsSection({ items }: { items: HashtagMomentum[] }) {
  if (items.length === 0) {
    return (
      <SectionCard title="Emerging" description="Hashtags whose 7-day momentum is rising.">
        <EmptyState message="No emerging hashtags are recorded yet." />
      </SectionCard>
    );
  }
  return (
    <SectionCard title="Emerging" description="Hashtags whose 7-day momentum is rising.">
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item.hashtag} className="flex items-baseline justify-between gap-4 text-sm">
            <Link href={`/hashtags/${encodeURIComponent(item.hashtag)}`} className="text-link">
              #{item.hashtag}
            </Link>
            <span className="text-ink-muted tabular-nums">
              {momentumLabel(item.status)}
              {typeof item.z_score_7d === "number"
                ? ` · z ${item.z_score_7d.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
                : ""}
            </span>
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}

export function AccountAgeList({ buckets }: { buckets: AccountAgeBucket[] }) {
  if (buckets.length === 0)
    return <EmptyState message="Account ages are empty until the rollup runs." />;
  const max = Math.max(...buckets.map((bucket) => bucket.authors ?? 0), 1);
  return (
    <ul className="space-y-3">
      {ACCOUNT_AGE_LABELS.map((label, index) => {
        const count = buckets.find((bucket) => bucket.bucket === index)?.authors ?? 0;
        return (
          <li key={label}>
            <div className="flex justify-between gap-4 text-sm">
              <span className="text-ink-soft">{accountAgeLabel(index)}</span>
              <span className="text-ink tabular-nums">{count.toLocaleString()}</span>
            </div>
            <ShareBar
              value={count}
              max={max}
              label={`${label}, ${count.toLocaleString()} authors`}
            />
          </li>
        );
      })}
    </ul>
  );
}
