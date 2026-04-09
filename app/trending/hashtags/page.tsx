import type { Metadata } from "next";

import { DebugDisclosure } from "@/components/explorer/debug-disclosure";
import { EmptyState } from "@/components/explorer/empty-state";
import { PageHero } from "@/components/explorer/page-hero";
import { HashtagsList } from "@/components/data/renderers";
import { SectionCard } from "@/components/ui/section-card";
import { ErrorPanel } from "@/components/ui/status-panels";
import { getTrendingHashtags } from "@/lib/api/endpoints";

export const metadata: Metadata = {
  title: "Trending Hashtags",
  description: "Hashtag pulse and ranked mention counts from NostrMash trending data.",
};

export default async function TrendingHashtagsPage() {
  let errorMessage = "";
  let payload: Awaited<ReturnType<typeof getTrendingHashtags>> | null = null;
  try {
    payload = await getTrendingHashtags("shortTtl");
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : "Failed to load trending hashtags.";
  }

  return (
    <div className="space-y-8">
      <PageHero
        eyebrow="Ranked hashtags"
        title="Trending hashtags"
        subtitle="Hashtag activity ordered by current mention counts."
      />
      <SectionCard
        title="Hashtag ranking"
        description="Top hashtags are elevated while lower ranks remain dense and scannable."
      >
        {errorMessage ? (
          <ErrorPanel message={errorMessage} />
        ) : payload?.hashtags && payload.hashtags.length > 0 ? (
          <HashtagsList hashtags={payload.hashtags} ranked searchable />
        ) : (
          <EmptyState
            title="No hashtag ranking available"
            message="The API did not return ranked hashtags for the current trend window."
          />
        )}
      </SectionCard>
      <DebugDisclosure title="Debug payload" data={payload ?? {}} />
    </div>
  );
}
