import Link from "@/components/app-link";

import { EmptyState } from "@/components/explorer/empty-state";
import { Timestamp } from "@/components/explorer/timestamp";
import { sanitizeExternalHref } from "@/components/explorer/utils";
import { StatCard, StatGrid } from "@/components/explorer/stat-card";
import { Pill } from "@/components/ui/pill";
import { SectionCard } from "@/components/ui/section-card";
import { ErrorPanel } from "@/components/ui/status-panels";
import { PlainRemoteImage } from "@/components/ui/plain-remote-image";
import { ApiError } from "@/lib/api/errors";
import {
  getAuthorAnalyticsSummary,
  getProfileBadges,
  getProfileExternalIdentities,
  getProfileInterests,
  getProfileLabels,
  getProfileLists,
  getProfileModeration,
  getProfileStatus,
} from "@/lib/api/endpoints";
import { toUserFacingErrorMessage } from "@/lib/errors/user-message";
import type { ProfileActivityTab } from "@/lib/profile/activity-tabs";
import { listKindLabel } from "@/lib/stats/surface-display";
import { formatBasisPointsAsPercent } from "@/lib/stats/ecosystem-display";
import type { ProfileGraphStats, UserStatus } from "@/lib/types/surfaces";

function PubkeyLink({ pubkey, label }: { pubkey: string; label?: string }) {
  const hex = pubkey.toLowerCase();
  const text = label && label.length > 0 ? label : `${hex.slice(0, 8)}…${hex.slice(-4)}`;
  return (
    <Link href={`/profiles/${hex}`} className="text-link hover:text-link-hover break-all">
      {text}
    </Link>
  );
}

function addressHref(address: string): string {
  return `/badges/${encodeURIComponent(address)}`;
}

function panelError(error: unknown, fallback: string): string | null {
  if (error instanceof ApiError && error.isNotFound) return null;
  return toUserFacingErrorMessage(error, fallback);
}

function currentStatus(statuses: UserStatus[]): UserStatus | null {
  const now = Math.floor(Date.now() / 1000);
  const visible = statuses.filter(
    (status) => typeof status.expires_at !== "number" || status.expires_at > now
  );
  return visible.find((status) => !status.d_tag) ?? visible[0] ?? null;
}

export async function ProfileStatusChip({ pubkey }: { pubkey: string }) {
  let statuses: UserStatus[] = [];
  try {
    const payload = await getProfileStatus(pubkey);
    statuses = payload.statuses ?? [];
  } catch (error) {
    if (error instanceof ApiError && error.isNotFound) return null;
    return null;
  }
  const status = currentStatus(statuses);
  if (!status?.content && !status?.link) return null;
  const href = sanitizeExternalHref(status.link);
  return (
    <p className="text-ink-soft flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
      <Pill tone="entity">Status</Pill>
      {status.content ? <span className="[overflow-wrap:anywhere]">{status.content}</span> : null}
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer nofollow"
          className="text-link hover:text-link-hover"
        >
          Link
        </a>
      ) : null}
      {typeof status.expires_at === "number" ? (
        <span className="text-ink-faint text-xs">
          Until <Timestamp unixSeconds={status.expires_at} />
        </span>
      ) : null}
    </p>
  );
}

export async function ProfileBadgesRow({ pubkey }: { pubkey: string }) {
  let awards: Array<{ address: string; awarded_at?: number }> = [];
  let accepted = new Set<string>();
  let errorMessage: string | null = null;
  try {
    const payload = await getProfileBadges(pubkey);
    awards = payload.awards ?? [];
    accepted = new Set(payload.accepted ?? []);
  } catch (error) {
    errorMessage = panelError(error, "Badges are unavailable.");
  }
  if (errorMessage) return <ErrorPanel message={errorMessage} title="Couldn't load badges" />;
  if (awards.length === 0 && accepted.size === 0) return null;
  const shown = awards.length > 0 ? awards : [...accepted].map((address) => ({ address }));
  return (
    <div className="mt-4">
      <h2 className="text-ink-faint text-xs font-medium">Badges</h2>
      <ul className="mt-2 flex flex-wrap gap-2">
        {shown.slice(0, 24).map((award) => (
          <li key={award.address}>
            <Link
              href={addressHref(award.address)}
              className="border-edge-strong text-ink-soft hover:text-ink inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs"
            >
              <span className="max-w-48 truncate">
                {award.address.split(":").slice(2).join(":") || award.address}
              </span>
              {accepted.has(award.address) ? (
                <span className="text-ink-faint">Accepted</span>
              ) : null}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function signedCount(value: number): { text: string; tone?: "up" | "down" } {
  if (value > 0) return { text: `+${value.toLocaleString()}`, tone: "up" };
  if (value < 0) return { text: value.toLocaleString(), tone: "down" };
  return { text: "0" };
}

function GraphCards({ graph }: { graph: ProfileGraphStats | undefined }) {
  if (!graph) return null;
  return (
    <StatGrid>
      {typeof graph.mutual_count === "number" ? (
        <StatCard
          plain
          label="Mutual follows"
          value={graph.mutual_count}
          description="People this profile follows who follow back."
        />
      ) : null}
      {typeof graph.reciprocity_bps === "number" ? (
        <StatCard
          plain
          label="Reciprocity"
          value={formatBasisPointsAsPercent(graph.reciprocity_bps)}
          description="Share of follows that are mutual."
        />
      ) : null}
      {typeof graph.follow_back_rate_bps === "number" ? (
        <StatCard
          plain
          label="Follow-back rate"
          value={formatBasisPointsAsPercent(graph.follow_back_rate_bps)}
          description="Share of followers this profile follows back."
        />
      ) : null}
      {typeof graph.ghost_follower_bps === "number" ? (
        <StatCard
          plain
          label="Ghost followers"
          value={formatBasisPointsAsPercent(graph.ghost_follower_bps)}
          description="Followers inactive for 90+ days."
        />
      ) : null}
    </StatGrid>
  );
}

type SurfaceModel =
  | { view: "missing" }
  | { view: "error"; message: string }
  | {
      view: "interests";
      lists: NonNullable<Awaited<ReturnType<typeof getProfileInterests>>["interests"]>;
    }
  | { view: "lists"; lists: NonNullable<Awaited<ReturnType<typeof getProfileLists>>["lists"]> }
  | { view: "labels"; labels: NonNullable<Awaited<ReturnType<typeof getProfileLabels>>["labels"]> }
  | {
      view: "identities";
      identities: NonNullable<
        Awaited<ReturnType<typeof getProfileExternalIdentities>>["identities"]
      >;
    }
  | { view: "moderation"; reports?: number; muted?: number }
  | {
      view: "graph";
      graph?: ProfileGraphStats;
      downvote?: number;
      net7?: number;
      net30?: number;
    };

async function loadProfileSurface(tab: ProfileActivityTab, pubkey: string): Promise<SurfaceModel> {
  try {
    if (tab === "interests") {
      const payload = await getProfileInterests(pubkey);
      return { view: "interests", lists: payload.interests ?? [] };
    }
    if (tab === "lists") {
      const payload = await getProfileLists(pubkey);
      return { view: "lists", lists: payload.lists ?? [] };
    }
    if (tab === "labels") {
      const payload = await getProfileLabels(pubkey);
      return { view: "labels", labels: payload.labels ?? [] };
    }
    if (tab === "identities") {
      const payload = await getProfileExternalIdentities(pubkey);
      return { view: "identities", identities: payload.identities ?? [] };
    }
    if (tab === "moderation") {
      const payload = await getProfileModeration(pubkey);
      return {
        view: "moderation",
        reports: payload.reports_received,
        muted: payload.muted_by_count,
      };
    }
    const summary = await getAuthorAnalyticsSummary(pubkey, "requestTime");
    return {
      view: "graph",
      graph: summary.graph,
      downvote: summary.downvote_ratio_bps,
      net7: summary.net_follower_change_7d,
      net30: summary.net_follower_change_30d,
    };
  } catch (error) {
    const message = panelError(error, "This profile section is unavailable.");
    return message ? { view: "error", message } : { view: "missing" };
  }
}

export async function ProfileSurfacePanel({
  tab,
  pubkey,
}: {
  tab: ProfileActivityTab;
  pubkey: string;
}) {
  const model = await loadProfileSurface(tab, pubkey);
  if (model.view === "missing") {
    return <EmptyState message="Nothing is recorded for this profile yet." />;
  }
  if (model.view === "error") {
    return <ErrorPanel message={model.message} title="Couldn't load this section" />;
  }
  if (model.view === "interests") {
    if (model.lists.length === 0) {
      return <EmptyState message="This profile has no public interest lists in the index." />;
    }
    return (
      <ul className="space-y-4">
        {model.lists.map((list, index) => (
          <li key={`${list.kind ?? "interest"}-${index}`}>
            <p className="text-ink text-sm font-medium">{listKindLabel(list.kind)}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {(list.hashtags ?? []).map((tag) => (
                <Link
                  key={tag}
                  href={`/hashtags/${encodeURIComponent(tag.replace(/^#/, ""))}`}
                  className="border-edge-strong text-ink-soft hover:text-ink rounded-full border px-2.5 py-1 text-xs"
                >
                  #{tag.replace(/^#/, "")}
                </Link>
              ))}
            </div>
          </li>
        ))}
      </ul>
    );
  }
  if (model.view === "lists") {
    if (model.lists.length === 0) {
      return <EmptyState message="This profile has no public relay lists in the index." />;
    }
    return (
      <ul className="space-y-4">
        {model.lists.map((list, index) => (
          <li key={`${list.kind ?? "list"}-${index}`}>
            <p className="text-ink text-sm font-medium">{listKindLabel(list.kind)}</p>
            <ul className="mt-2 space-y-1">
              {(list.relays ?? []).map((relay) => (
                <li key={relay} className="text-ink-soft font-mono text-xs break-all">
                  {relay}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    );
  }
  if (model.view === "labels") {
    if (model.labels.length === 0) {
      return <EmptyState message="No labels attached to this profile are in the index." />;
    }
    return (
      <ul className="divide-edge/70 divide-y">
        {model.labels.map((label, index) => (
          <li key={`${label.namespace ?? ""}-${label.label}-${index}`} className="py-2 text-sm">
            <span className="text-ink">{label.label}</span>
            {label.namespace ? (
              <span className="text-ink-faint ml-2 text-xs">{label.namespace}</span>
            ) : null}
            {label.labeler_pubkey ? (
              <span className="text-ink-muted ml-2 text-xs">
                by <PubkeyLink pubkey={label.labeler_pubkey} />
              </span>
            ) : null}
          </li>
        ))}
      </ul>
    );
  }
  if (model.view === "identities") {
    if (model.identities.length === 0) {
      return <EmptyState message="This profile has no external identities in the index." />;
    }
    return (
      <ul className="divide-edge/70 divide-y">
        {model.identities.map((identity) => {
          const proof = sanitizeExternalHref(identity.proof);
          return (
            <li key={`${identity.platform}-${identity.identity ?? ""}`} className="py-2 text-sm">
              <span className="text-ink font-medium">{identity.platform}</span>
              {identity.identity ? (
                <span className="text-ink-soft ml-2 break-all">{identity.identity}</span>
              ) : null}
              {proof ? (
                <a
                  href={proof}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="text-link hover:text-link-hover ml-2 text-xs"
                >
                  Proof
                </a>
              ) : null}
            </li>
          );
        })}
      </ul>
    );
  }
  if (model.view === "moderation") {
    if (typeof model.reports !== "number" && typeof model.muted !== "number") {
      return (
        <EmptyState message="No public reports or mute counts are recorded for this profile." />
      );
    }
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        {typeof model.reports === "number" ? (
          <StatCard plain label="Reports received" value={model.reports} />
        ) : null}
        {typeof model.muted === "number" ? (
          <StatCard plain label="Muted by" value={model.muted} />
        ) : null}
      </div>
    );
  }
  const hasNet = typeof model.net7 === "number" || typeof model.net30 === "number";
  if (!model.graph && !hasNet && typeof model.downvote !== "number") {
    return <EmptyState message="Follow-graph stats are not available for this profile yet." />;
  }
  return (
    <div className="space-y-4">
      <GraphCards graph={model.graph} />
      <StatGrid>
        {typeof model.downvote === "number" ? (
          <StatCard
            plain
            label="Downvote ratio"
            value={formatBasisPointsAsPercent(model.downvote)}
            description="Share of reactions received in 30 days that were downvotes."
          />
        ) : null}
        {typeof model.net7 === "number" ? (
          <StatCard
            plain
            label="Net followers, 7 days"
            value={signedCount(model.net7).text}
            tone={signedCount(model.net7).tone}
            description="Follower change over 7 days."
          />
        ) : null}
        {typeof model.net30 === "number" ? (
          <StatCard
            plain
            label="Net followers, 30 days"
            value={signedCount(model.net30).text}
            tone={signedCount(model.net30).tone}
            description="Follower change over 30 days."
          />
        ) : null}
      </StatGrid>
    </div>
  );
}

export function BadgeDefinition({
  name,
  description,
  image,
  awards,
  issuer,
}: {
  name?: string;
  description?: string;
  image?: string;
  awards?: number;
  issuer?: string;
}) {
  const src = image && /^https?:\/\//i.test(image) ? image : null;
  return (
    <SectionCard title={name || "Badge"}>
      <div className="flex items-start gap-4">
        {src ? (
          <PlainRemoteImage
            src={src}
            alt=""
            width={72}
            height={72}
            className="h-16 w-16 rounded-lg object-cover"
          />
        ) : null}
        <div className="min-w-0 space-y-2">
          {description ? <p className="text-ink-soft text-sm leading-6">{description}</p> : null}
          {typeof awards === "number" ? (
            <p className="text-ink text-sm tabular-nums">{awards.toLocaleString()} awards</p>
          ) : null}
          {issuer ? (
            <p className="text-ink-muted text-sm">
              Issued by <PubkeyLink pubkey={issuer} />
            </p>
          ) : null}
        </div>
      </div>
    </SectionCard>
  );
}
