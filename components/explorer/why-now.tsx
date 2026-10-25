import {
  extractPrimitiveStats,
  extractRelayHostsFromNote,
  formatValue,
} from "@/components/explorer/utils";
import { mapServerRankingReasons } from "@/lib/discover/reasons";
import type { DomainEntry, EventRecord, HashtagEntry, Profile } from "@/lib/types/api";

export type WhyNowReason = {
  text: string;
  support?: string;
  code?: string;
};

type WhyNowTone = "default" | "highlight";

function readableCount(value: number, singular: string, plural: string): string {
  const rounded = Math.round(value);
  return `${rounded.toLocaleString()} ${rounded === 1 ? singular : plural}`;
}

/**
 * A single post, reply, or mention is noise, not momentum. Inferred "momentum"
 * reasons need at least this many to be shown; otherwise they fall through to
 * the next reason so a rank is never justified by "1 post".
 */
const MOMENTUM_FLOOR = 2;

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
  const serverReasons = mapServerRankingReasons(note.ranking);
  if (serverReasons.length > 0) return serverReasons;

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

function positiveNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : null;
}

/**
 * Related-profile adjacency signals from `/profiles/{pubkey}/related` and the
 * summary's `related_discovery`. Returns [] for profiles that did not come
 * from a relatedness query so callers can fall through to momentum reasons.
 */
export function mapRelatedProfileReasons(profile: Profile): WhyNowReason[] {
  const reasonCodes = Array.isArray(profile.reasons)
    ? new Set(profile.reasons.filter((code): code is string => typeof code === "string"))
    : new Set<string>();
  const interactions = positiveNumber(profile.interaction_adjacency);
  const replies = positiveNumber(profile.reply_adjacency);
  const quoteReposts = positiveNumber(profile.quote_repost_adjacency);
  const topics = positiveNumber(profile.topic_overlap);

  const reasons: WhyNowReason[] = [];
  if (interactions !== null || reasonCodes.has("interaction_adjacency")) {
    reasons.push({
      text: "interacts often",
      support:
        interactions !== null
          ? readableCount(interactions, "interaction", "interactions")
          : undefined,
    });
  }
  if (replies !== null || reasonCodes.has("reply_adjacency")) {
    reasons.push({
      text: "replies back and forth",
      support: replies !== null ? readableCount(replies, "reply", "replies") : undefined,
    });
  }
  if (quoteReposts !== null || reasonCodes.has("quote_repost_adjacency")) {
    reasons.push({
      text: "quotes and reposts",
      support: quoteReposts !== null ? readableCount(quoteReposts, "share", "shares") : undefined,
    });
  }
  if (topics !== null || reasonCodes.has("topic_overlap")) {
    reasons.push({
      text: "shared topics",
      support: topics !== null ? readableCount(topics, "topic", "topics") : undefined,
    });
  }
  return dedupeReasons(reasons);
}

/**
 * One line for the profile rail. The list order is the server's combined
 * score, so the line lists every signal instead of a single count that
 * looks like the rank.
 */
export function relatedRailReasonLine(profile: Profile): string | null {
  const parts: string[] = [];
  const add = (value: number | undefined, singular: string, plural: string) => {
    if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) return;
    const rounded = Math.round(value);
    parts.push(`${rounded.toLocaleString()} ${rounded === 1 ? singular : plural}`);
  };
  add(profile.interaction_adjacency, "interaction", "interactions");
  add(profile.reply_adjacency, "reply", "replies");
  add(profile.quote_repost_adjacency, "share", "shares");
  add(profile.topic_overlap, "topic", "topics");
  if (parts.length > 0) return parts.join(" · ");
  const fallback = mapRelatedProfileReasons(profile)[0];
  if (!fallback) return null;
  return fallback.support ? `${fallback.text} · ${fallback.support}` : fallback.text;
}

export function mapProfileWhyNow(profile: Profile): WhyNowReason[] {
  const serverReasons = mapServerRankingReasons(profile.ranking);
  if (serverReasons.length > 0) return serverReasons;

  const relatedReasons = mapRelatedProfileReasons(profile);
  if (relatedReasons.length > 0) return relatedReasons;

  const metrics = extractPrimitiveStats(profile, []);
  const postCount =
    findNumericMetric(metrics, /recent_post_count|post_count|note_count|recent_post/i) ?? null;
  const activeDays = findNumericMetric(metrics, /recent_active_days|active_days/i);
  const replyPickup = findNumericMetric(metrics, /recent_reply_count|reply_count|repl(y|ies)/i);

  // No "identity completeness" fallback: a filled-in profile is a static
  // property, not a reason something is moving now. An empty list is more
  // honest than a filler reason.
  const reasons: WhyNowReason[] = [];
  if (postCount !== null && postCount >= MOMENTUM_FLOOR) {
    reasons.push({
      text: "posting momentum",
      support: readableCount(postCount, "post", "posts"),
    });
  }
  if (activeDays !== null && activeDays >= MOMENTUM_FLOOR) {
    reasons.push({
      text: "recent active days",
      support: readableCount(activeDays, "active day", "active days"),
    });
  }
  if (replyPickup !== null && replyPickup >= MOMENTUM_FLOOR) {
    reasons.push({
      text: "reply pickup",
      support: readableCount(replyPickup, "reply", "replies"),
    });
  }

  return dedupeReasons(reasons);
}

export function mapHashtagWhyNow(entry: HashtagEntry): WhyNowReason[] {
  const serverReasons = mapServerRankingReasons(entry.ranking);
  if (serverReasons.length > 0) return serverReasons;

  const mentionCount = typeof entry.count === "number" && entry.count > 0 ? entry.count : null;
  const noteCount =
    typeof entry.event_count === "number" && entry.event_count > 0 ? entry.event_count : null;
  const authorCount =
    typeof entry.unique_authors === "number" && entry.unique_authors > 0
      ? entry.unique_authors
      : null;

  const reasons: WhyNowReason[] = [];
  if (authorCount !== null && authorCount > 1) {
    reasons.push({
      code: "author_breadth",
      text: "breadth of authors",
      support: readableCount(authorCount, "author", "authors"),
    });
  }
  if (noteCount !== null && noteCount >= MOMENTUM_FLOOR) {
    reasons.push({
      text: "topic lift",
      support: readableCount(noteCount, "note", "notes"),
    });
  }
  if (mentionCount !== null && mentionCount >= MOMENTUM_FLOOR) {
    reasons.push({
      text: "mention acceleration",
      support: readableCount(mentionCount, "mention", "mentions"),
    });
  }

  return dedupeReasons(reasons);
}

export function mapDomainWhyNow(entry: DomainEntry): WhyNowReason[] {
  const serverReasons = mapServerRankingReasons(entry.ranking);
  if (serverReasons.length > 0) return serverReasons;

  const linkCount = positiveNumber(entry.link_count);
  const linkedNotes = positiveNumber(entry.note_count) ?? positiveNumber(entry.event_count);
  const appearanceCount = positiveNumber(entry.count);
  const authorCount = positiveNumber(entry.unique_authors);

  // Author breadth is the list order. Volume is a secondary fact. `count`
  // is a legacy appearance tally that can be far below `link_count` for the
  // same domain, so it is only a last resort.
  const reasons: WhyNowReason[] = [];
  if (authorCount !== null && authorCount > 1) {
    reasons.push({
      code: "author_breadth",
      text: "author breadth",
      support: readableCount(authorCount, "author", "authors"),
    });
  }
  if (linkCount !== null && linkCount >= MOMENTUM_FLOOR) {
    reasons.push({
      text: "link circulation",
      support: readableCount(linkCount, "link", "links"),
    });
  }
  if (linkedNotes !== null && linkedNotes >= MOMENTUM_FLOOR) {
    reasons.push({
      text: "linked note activity",
      support: readableCount(linkedNotes, "note", "notes"),
    });
  }
  if (appearanceCount !== null && appearanceCount >= MOMENTUM_FLOOR) {
    reasons.push({
      text: "repeated appearances",
      support: readableCount(appearanceCount, "appearance", "appearances"),
    });
  }

  return dedupeReasons(reasons);
}

/** Stat keys already stated on the why-now line, so the pill row does not repeat them. */
export function statsCitedByReasons(reasons: WhyNowReason[]): string[] {
  const blob = reasons
    .map((reason) => `${reason.text} ${reason.support ?? ""}`)
    .join(" ")
    .toLowerCase();
  const cited: string[] = [];
  if (/\brepl/.test(blob)) cited.push("reply_count");
  if (/repost|boost/.test(blob)) cited.push("repost_count");
  if (/reaction|\blike/.test(blob)) cited.push("reaction_count");
  if (/\bzap/.test(blob)) cited.push("zap_count");
  return cited;
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
      ? "text-xs font-semibold tracking-[0.12em] text-accent-ink uppercase"
      : "text-xs font-semibold tracking-[0.12em] text-ink-faint uppercase";
  const reasonClassName =
    tone === "highlight" ? "border-link/30 bg-link/10 text-accent-ink" : "text-ink-dim";
  const supportClassName = tone === "highlight" ? "text-link-hover/80" : "text-ink-faint";
  const dotClassName = tone === "highlight" ? "text-link-hover/60" : "text-ink-faint/70";

  return (
    <div className={`${containerClassName} ${className}`.trim()}>
      {showLabel ? <p className={titleClassName}>Why now</p> : null}
      <div
        className={`flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] leading-5 ${showLabel ? "mt-1.5" : ""}`.trim()}
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
