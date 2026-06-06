import {
  extractPrimitiveStats,
  extractRelayHostsFromNote,
  formatValue,
} from "@/components/explorer/utils";
import type { DomainEntry, EventRecord, HashtagEntry, Profile } from "@/lib/types/api";

export type WhyNowReason = {
  text: string;
  support?: string;
};

type WhyNowTone = "default" | "highlight";

function readableCount(value: number, singular: string, plural: string): string {
  return `${value.toLocaleString()} ${value === 1 ? singular : plural}`;
}

function findNumericMetric(
  metrics: Array<{ label: string; value: string | number | boolean }>,
  matcher: RegExp
): number | null {
  const match = metrics.find((metric) => matcher.test(metric.label));
  if (!match) return null;
  if (typeof match.value === "number" && Number.isFinite(match.value)) return match.value;
  if (typeof match.value === "string") {
    const normalized = Number(match.value.replace(/[,_\s]/g, ""));
    return Number.isFinite(normalized) ? normalized : null;
  }
  return null;
}

function nonEmptyText(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function dedupeReasons(reasons: WhyNowReason[]): WhyNowReason[] {
  const seen = new Set<string>();
  return reasons.filter((reason) => {
    const key = `${reason.text}::${reason.support ?? ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function renderSupport(value: unknown): string {
  const rendered = formatValue(value);
  return rendered === "—" ? "" : rendered;
}

export function mapNoteWhyNow(note: EventRecord): WhyNowReason[] {
  const metrics = extractPrimitiveStats(note, [
    "id",
    "pubkey",
    "kind",
    "created_at",
    "content",
    "tags",
  ]).filter((entry) => /(reply|repost|boost|zap|like|reaction|engagement)/i.test(entry.label));
  const relayCount = extractRelayHostsFromNote(note, 8).length;

  const replyCount = findNumericMetric(metrics, /reply|repl(y|ies)/i);
  const repostCount = findNumericMetric(metrics, /repost|boost/i);
  const engagementCount = findNumericMetric(metrics, /zap|like|reaction|engagement/i);

  const reasons: WhyNowReason[] = [];
  if (replyCount !== null && replyCount > 0) {
    reasons.push({
      text: "rising replies",
      support: readableCount(replyCount, "reply", "replies"),
    });
  }
  if (repostCount !== null && repostCount > 0) {
    reasons.push({
      text: "repost lift",
      support: readableCount(repostCount, "repost", "reposts"),
    });
  }
  if (engagementCount !== null && engagementCount > 0) {
    reasons.push({
      text: "recent engagement",
      support: readableCount(engagementCount, "interaction", "interactions"),
    });
  }
  if (relayCount > 1) {
    reasons.push({
      text: "cross-relay visibility",
      support: readableCount(relayCount, "relay", "relays"),
    });
  }

  return dedupeReasons(reasons);
}

export function mapProfileWhyNow(profile: Profile): WhyNowReason[] {
  const metrics = extractPrimitiveStats(profile, []);
  const postCount =
    findNumericMetric(metrics, /recent_post_count|post_count|note_count|recent_post/i) ?? null;
  const activeDays = findNumericMetric(metrics, /recent_active_days|active_days/i);
  const replyPickup = findNumericMetric(metrics, /recent_reply_count|reply_count|repl(y|ies)/i);
  const identityFields = [
    nonEmptyText(profile.display_name),
    nonEmptyText(profile.name),
    nonEmptyText(profile.about),
    nonEmptyText(profile.picture),
    nonEmptyText(profile.nip05),
    nonEmptyText(profile.lud16),
    nonEmptyText(profile.website),
  ].filter(Boolean).length;

  const reasons: WhyNowReason[] = [];
  if (postCount !== null && postCount > 0) {
    reasons.push({
      text: "posting momentum",
      support: readableCount(postCount, "post", "posts"),
    });
  }
  if (activeDays !== null && activeDays > 0) {
    reasons.push({
      text: "recent active days",
      support: readableCount(activeDays, "active day", "active days"),
    });
  }
  if (replyPickup !== null && replyPickup > 0) {
    reasons.push({
      text: "reply pickup",
      support: readableCount(replyPickup, "reply", "replies"),
    });
  }
  if (identityFields >= 3) {
    reasons.push({
      text: "identity completeness",
      support: readableCount(identityFields, "profile signal", "profile signals"),
    });
  }

  return dedupeReasons(reasons);
}

export function mapHashtagWhyNow(entry: HashtagEntry): WhyNowReason[] {
  const mentionCount = typeof entry.count === "number" && entry.count > 0 ? entry.count : null;
  const noteCount =
    typeof entry.event_count === "number" && entry.event_count > 0 ? entry.event_count : null;
  const authorCount =
    typeof entry.unique_authors === "number" && entry.unique_authors > 0
      ? entry.unique_authors
      : null;

  const reasons: WhyNowReason[] = [];
  if (noteCount !== null) {
    reasons.push({
      text: "topic lift",
      support: readableCount(noteCount, "note", "notes"),
    });
  }
  if (mentionCount !== null) {
    reasons.push({
      text: "mention acceleration",
      support: readableCount(mentionCount, "mention", "mentions"),
    });
  }
  if (authorCount !== null && authorCount > 1) {
    reasons.push({
      text: "breadth of authors",
      support: readableCount(authorCount, "author", "authors"),
    });
  }

  return dedupeReasons(reasons);
}

export function mapDomainWhyNow(entry: DomainEntry): WhyNowReason[] {
  const appearanceCount = typeof entry.count === "number" && entry.count > 0 ? entry.count : null;
  const linkedActivity =
    typeof entry.event_count === "number" && entry.event_count > 0 ? entry.event_count : null;
  const authorCount =
    typeof entry.unique_authors === "number" && entry.unique_authors > 0
      ? entry.unique_authors
      : null;

  const reasons: WhyNowReason[] = [];
  if (appearanceCount !== null) {
    reasons.push({
      text: "repeated appearances",
      support: readableCount(appearanceCount, "appearance", "appearances"),
    });
  }
  if (authorCount !== null && authorCount > 1) {
    reasons.push({
      text: "author breadth",
      support: readableCount(authorCount, "author", "authors"),
    });
  }
  if (linkedActivity !== null) {
    reasons.push({
      text: "linked note activity",
      support: readableCount(linkedActivity, "note", "notes"),
    });
  }

  return dedupeReasons(reasons);
}

export function WhyNow({
  reasons,
  maxReasons = 1,
  tone = "default",
  showLabel = true,
  className = "",
}: {
  reasons: WhyNowReason[];
  maxReasons?: number;
  tone?: WhyNowTone;
  showLabel?: boolean;
  className?: string;
}) {
  const visibleReasons = reasons
    .filter((reason) => reason.text.trim().length > 0)
    .slice(0, Math.max(0, maxReasons));

  if (visibleReasons.length === 0) return null;

  const containerClassName =
    tone === "highlight" ? "rounded-xl border border-link/20 bg-accent/[0.07] px-3.5 py-2.5" : "";
  const titleClassName =
    tone === "highlight"
      ? "text-[10px] font-semibold tracking-[0.16em] text-accent-ink uppercase"
      : "text-[10px] font-semibold tracking-[0.16em] text-ink-faint uppercase";
  const reasonClassName =
    tone === "highlight" ? "border-link/30 bg-link/10 text-accent-ink" : "text-ink-dim";
  const supportClassName = tone === "highlight" ? "text-link-hover/80" : "text-ink-faint";
  const dotClassName = tone === "highlight" ? "text-link-hover/60" : "text-ink-faint/70";

  return (
    <div className={`${containerClassName} ${className}`.trim()}>
      {showLabel ? <p className={titleClassName}>Why now</p> : null}
      <div
        className={`flex flex-wrap items-center gap-x-2 gap-y-1 text-xs leading-5 ${showLabel ? "mt-1.5" : ""}`.trim()}
      >
        {!showLabel && tone !== "highlight" ? (
          <span aria-hidden className="bg-accent-soft/70 inline-block h-1.5 w-1.5 rounded-full" />
        ) : null}
        {visibleReasons.map((reason, index) => (
          <span
            key={`${reason.text}-${reason.support ?? index}`}
            className="inline-flex items-center gap-2"
          >
            {index > 0 ? (
              <span aria-hidden className={dotClassName}>
                •
              </span>
            ) : null}
            <span
              className={
                tone === "highlight"
                  ? `inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 ${reasonClassName}`
                  : `inline-flex items-center gap-1.5 ${reasonClassName}`
              }
            >
              <span>{reason.text}</span>
              {reason.support && renderSupport(reason.support).length > 0 ? (
                <>
                  <span aria-hidden className={dotClassName}>
                    ·
                  </span>
                  <span className={supportClassName}>{renderSupport(reason.support)}</span>
                </>
              ) : null}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}
