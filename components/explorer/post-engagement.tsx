import type { ReactNode } from "react";

import type { EngagementStat, EngagementStatKey } from "@/components/explorer/utils";

const STAT_SIZE = {
  sm: "text-[13px]",
  md: "text-sm",
} as const;

function phrase(count: number, singular: string, plural: string): string {
  return `${count.toLocaleString()} ${count === 1 ? singular : plural}`;
}

/** Screen-reader and tooltip name for one post stat. */
export function engagementAccessibleName(stat: EngagementStat): string {
  switch (stat.label) {
    case "reply_count":
      return phrase(stat.value, "reply", "replies");
    case "repost_count": {
      const base = phrase(stat.value, "repost", "reposts");
      const quotes = stat.quoteCount ?? 0;
      if (quotes <= 0) return base;
      return `${base}, including ${phrase(quotes, "quote post", "quote posts")}`;
    }
    case "reaction_count":
      return phrase(stat.value, "reaction", "reactions");
    case "zap_count": {
      const base = phrase(stat.value, "zap", "zaps");
      return stat.detail ? `${base}, ${stat.detail}` : base;
    }
  }
}

function EngagementGlyph({ children }: { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-[1.05em] w-[1.05em]"
      aria-hidden
    >
      {children}
    </svg>
  );
}

export function ReplyIcon() {
  return (
    <EngagementGlyph>
      <path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8v.5z" />
    </EngagementGlyph>
  );
}

export function RepostIcon() {
  return (
    <EngagementGlyph>
      <path d="M17 2l4 4-4 4" />
      <path d="M3 11V9a4 4 0 0 1 4-4h14" />
      <path d="M7 22l-4-4 4-4" />
      <path d="M21 13v2a4 4 0 0 1-4 4H3" />
    </EngagementGlyph>
  );
}

export function ReactionIcon() {
  return (
    <EngagementGlyph>
      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
    </EngagementGlyph>
  );
}

export function ZapIcon() {
  return (
    <EngagementGlyph>
      <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8z" />
    </EngagementGlyph>
  );
}

const STAT_ICONS: Record<EngagementStatKey, () => ReactNode> = {
  reply_count: ReplyIcon,
  repost_count: RepostIcon,
  reaction_count: ReactionIcon,
  zap_count: ZapIcon,
};

function EngagementStatView({ stat }: { stat: EngagementStat }) {
  const name = engagementAccessibleName(stat);
  const Icon = STAT_ICONS[stat.label];
  return (
    <span role="group" aria-label={name} title={name} className="inline-flex items-center gap-1.5">
      <span aria-hidden className="text-ink-faint inline-flex">
        <Icon />
      </span>
      <span aria-hidden className="text-ink-soft font-medium tabular-nums">
        {stat.value.toLocaleString()}
      </span>
      {stat.detail ? (
        <span aria-hidden className="text-ink-muted">
          {stat.detail}
        </span>
      ) : null}
    </span>
  );
}

/**
 * Reply, repost (including quote posts), reaction, and zap counts.
 * Zeros stay visible so every post uses the same row.
 */
export function PostEngagement({
  stats,
  className = "",
  size = "sm",
  replacements,
}: {
  stats: EngagementStat[];
  className?: string;
  size?: keyof typeof STAT_SIZE;
  /** Swap one stat, keyed by its label, for a control such as the repost rollup. */
  replacements?: Partial<Record<EngagementStatKey, ReactNode>>;
}) {
  if (stats.length === 0) return null;
  return (
    <div
      className={`flex flex-wrap items-center gap-x-3.5 gap-y-1.5 ${STAT_SIZE[size]} ${className}`.trim()}
      data-post-engagement
    >
      {stats.map((stat) => {
        const replacement = replacements?.[stat.label];
        if (replacement) {
          return (
            <span key={stat.label} className="contents">
              {replacement}
            </span>
          );
        }
        return <EngagementStatView key={stat.label} stat={stat} />;
      })}
    </div>
  );
}
