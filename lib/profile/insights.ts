import { fetchApiJson } from "@/lib/api/http";
import { nativeApiV1Routes, withPubkeyCandidates } from "@/lib/api/endpoints/shared";

export type AuthorInsights = {
  hours: { hour: number; posts: number }[];
  activeDays: number | null;
  topics: { hashtag: string; count: number }[];
  notes: { id: string; excerpt: string }[];
  comparison: string | null;
  mix: string | null;
};

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function num(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function text(value: unknown): string {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
}

async function readJson(path: string, query?: Record<string, string>): Promise<unknown | null> {
  try {
    return await fetchApiJson<unknown>(path, { cacheClass: "requestTime", query });
  } catch {
    return null;
  }
}

function rowsOf(value: unknown, key: string): unknown[] {
  const list = record(value)?.[key];
  return Array.isArray(list) ? list : [];
}

function parse(
  patterns: unknown,
  topics: unknown,
  notes: unknown,
  performance: unknown
): AuthorInsights {
  const hours = rowsOf(patterns, "by_hour")
    .flatMap((row) => {
      const item = record(row);
      const hour = num(item?.hour_of_day);
      const posts = num(item?.post_count);
      if (hour === null || posts === null || hour < 0 || hour > 23) return [];
      return [{ hour, posts }];
    })
    .sort((a, b) => a.hour - b.hour);

  const activeDays = rowsOf(patterns, "by_day").filter(
    (row) => (num(record(row)?.post_count) ?? 0) > 0
  ).length;

  const topicRows = rowsOf(topics, "items").flatMap((row) => {
    const item = record(row);
    const hashtag = text(item?.hashtag).replace(/^#/, "");
    const count = num(item?.usage_count);
    if (!hashtag || count === null || count < 1) return [];
    return [{ hashtag, count }];
  });

  const noteRows = rowsOf(notes, "items").flatMap((row) => {
    const item = record(row);
    const id = text(item?.event_id);
    const excerpt = text(item?.content).slice(0, 160);
    if (!id) return [];
    return [{ id, excerpt: excerpt || "Note" }];
  });

  const summary = record(record(performance)?.summary) ?? record(performance);
  const comparison = record(summary?.comparison);
  const noteCount = num(summary?.note_count);
  const delta = num(comparison?.note_count_delta);
  let comparisonText: string | null = null;
  if (noteCount !== null && delta !== null) {
    if (delta === 0) {
      comparisonText = `Published ${noteCount} notes in 30 days, the same count as the previous 30 days.`;
    } else {
      const amount = Math.abs(delta);
      const word = amount === 1 ? "note" : "notes";
      comparisonText = `Published ${noteCount} notes in 30 days, ${amount} ${word} ${delta > 0 ? "more" : "fewer"} than the previous 30 days.`;
    }
  }

  const mixRecord = record(summary?.media_mix);
  const mixParts = [
    ["text", num(mixRecord?.text_only_count)],
    ["articles", num(mixRecord?.with_article_count)],
    ["pictures", num(mixRecord?.with_image_count)],
    ["video", num(mixRecord?.with_video_count)],
  ].flatMap(([label, count]) =>
    typeof count === "number" && count > 0 ? [`${label} ${count}`] : []
  );

  return {
    hours: hours.some((hour) => hour.posts > 0) ? hours : [],
    activeDays: activeDays > 0 ? activeDays : null,
    topics: topicRows.slice(0, 8),
    notes: noteRows.slice(0, 3),
    comparison: comparisonText,
    mix: mixParts.length > 0 ? mixParts.join(" · ") : null,
  };
}

export function insightsHaveContent(insights: AuthorInsights): boolean {
  return (
    insights.hours.length > 0 ||
    insights.topics.length > 0 ||
    insights.notes.length > 0 ||
    Boolean(insights.comparison) ||
    Boolean(insights.mix)
  );
}

export async function loadAuthorInsights(pubkey: string): Promise<AuthorInsights | null> {
  try {
    return await withPubkeyCandidates(
      pubkey,
      async (candidate) => {
        const query = { window: "30d" };
        const patterns = await fetchApiJson<unknown>(
          nativeApiV1Routes.authorAnalyticsPostingPatterns(candidate),
          { cacheClass: "requestTime", query }
        );
        const [topics, notes, performance] = await Promise.all([
          readJson(nativeApiV1Routes.authorAnalyticsTopics(candidate), query),
          readJson(nativeApiV1Routes.authorAnalyticsTopNotes(candidate), { ...query, limit: "5" }),
          readJson(nativeApiV1Routes.authorAnalyticsPerformance(candidate), query),
        ]);
        return parse(patterns, topics, notes, performance);
      },
      "Author insights lookup failed."
    );
  } catch {
    return null;
  }
}
