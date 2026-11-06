import type { Metadata } from "next";

import { LiveRefresh } from "@/components/freshness/live-refresh";
import { StatsFrame } from "@/components/stats/stats-frame";
import {
  ContentShapeSection,
  ConversationStatsSection,
  DeletionStatsSection,
  EmojiStatsSection,
  KindStatsSection,
  LabelStatsSection,
  MediaHostStatsSection,
} from "@/components/stats/surface-sections";
import { LoadErrors } from "@/components/ui/status-panels";
import {
  getContentStats,
  getConversationStats,
  getDeletionStats,
  getEmojiStats,
  getKindStats,
  getLabelStats,
  getMediaHostStats,
  readContentShape,
} from "@/lib/api/endpoints";
import { activityHeadline } from "@/lib/stats/headlines";
import { settle } from "@/lib/stats/settle";
import { toUrlSearchParams } from "@/lib/search-params/pagination";
import { formatStatsWindowSpan, readStatsWindow } from "@/lib/search-params/window";
import { buildEntityMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildEntityMetadata({
  title: "Activity stats",
  description: "Kinds, conversations, deletions, labels, emoji, and media hosts.",
  path: "/stats/activity",
});

export default async function ActivityStatsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolved = await searchParams;
  const current = toUrlSearchParams(resolved);
  const window = readStatsWindow(resolved);
  const [kinds, content, conversations, deletions, labels, emoji, media] = await Promise.all([
    settle(getKindStats(window), "Kind stats are unavailable."),
    settle(getContentStats(), "Content shape is unavailable."),
    settle(getConversationStats(), "Conversation stats are unavailable."),
    settle(getDeletionStats(), "Deletion stats are unavailable."),
    settle(getLabelStats(), "Label stats are unavailable."),
    settle(getEmojiStats(window), "Emoji stats are unavailable."),
    settle(getMediaHostStats(), "Media host stats are unavailable."),
  ]);
  const errors = [kinds, content, conversations, deletions, labels, emoji, media].flatMap(
    (result) => (result.error ? [result.error] : [])
  );

  return (
    <>
      <LiveRefresh />
      <StatsFrame
        path="/stats/activity"
        title="What the index is made of."
        subtitle={`Kinds, conversations, and the shape of content ${formatStatsWindowSpan(window)}.`}
        headline={activityHeadline(kinds.value, window)}
        searchParams={current}
        window={window}
        toc={[
          { id: "kinds", label: "Kinds" },
          { id: "content-shape", label: "Content shape" },
          { id: "conversations", label: "Conversations" },
          { id: "deletions", label: "Deletions" },
          { id: "labels", label: "Labels" },
          { id: "emoji", label: "Emoji" },
          { id: "media-hosts", label: "Media hosts" },
        ]}
      >
        <LoadErrors errors={errors} />
        <KindStatsSection data={kinds.value} window={window} />
        <ContentShapeSection data={readContentShape(content.value)} />
        <ConversationStatsSection data={conversations.value} />
        <DeletionStatsSection data={deletions.value} />
        <LabelStatsSection data={labels.value} />
        <EmojiStatsSection data={emoji.value} window={window} />
        <MediaHostStatsSection data={media.value} />
      </StatsFrame>
    </>
  );
}
