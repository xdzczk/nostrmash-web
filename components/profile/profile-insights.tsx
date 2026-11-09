import Link from "@/components/app-link";

import { SectionCard } from "@/components/ui/section-card";
import { insightsHaveContent, loadAuthorInsights } from "@/lib/profile/insights";

export async function ProfileInsights({ pubkey }: { pubkey: string }) {
  const insights = await loadAuthorInsights(pubkey);
  if (!insights || !insightsHaveContent(insights)) return null;
  const peak = insights.hours.reduce((max, hour) => Math.max(max, hour.posts), 0);

  return (
    <SectionCard id="author-insights" title="How this account works">
      <div className="space-y-6">
        {insights.comparison ? (
          <p className="text-ink-soft text-sm leading-6">{insights.comparison}</p>
        ) : null}
        {insights.mix ? (
          <p className="text-ink-muted text-sm">Last 30 days: {insights.mix}</p>
        ) : null}
        {insights.hours.length > 0 ? (
          <div>
            <h3 className="text-ink-dim mb-2 text-xs font-medium tracking-wide uppercase">
              Posting hours, UTC
              {insights.activeDays
                ? ` · active on ${insights.activeDays} day${insights.activeDays === 1 ? "" : "s"}`
                : ""}
            </h3>
            <div className="flex h-12 items-end gap-0.5" aria-hidden>
              {insights.hours.map((hour) => (
                <span
                  key={hour.hour}
                  title={`${hour.hour}:00 UTC · ${hour.posts} posts`}
                  className="bg-ink/70 min-w-0 flex-1 rounded-sm"
                  style={{ height: `${Math.max(8, (hour.posts / peak) * 100)}%` }}
                />
              ))}
            </div>
          </div>
        ) : null}
        {insights.topics.length > 0 ? (
          <ul className="flex flex-wrap gap-x-4 gap-y-1">
            {insights.topics.map((topic) => (
              <li key={topic.hashtag}>
                <Link
                  href={`/hashtags/${encodeURIComponent(topic.hashtag)}`}
                  className="text-ink text-sm hover:underline"
                >
                  {`#${topic.hashtag}`}
                </Link>
                <span className="text-ink-muted text-xs"> {topic.count}</span>
              </li>
            ))}
          </ul>
        ) : null}
        {insights.notes.length > 0 ? (
          <ol className="space-y-3">
            {insights.notes.map((note) => (
              <li key={note.id}>
                <Link
                  href={`/notes/${encodeURIComponent(note.id)}`}
                  className="text-ink-soft hover:text-ink line-clamp-2 text-sm leading-6"
                >
                  {note.excerpt}
                </Link>
              </li>
            ))}
          </ol>
        ) : null}
      </div>
    </SectionCard>
  );
}
