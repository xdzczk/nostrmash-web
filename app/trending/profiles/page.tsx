import type { Metadata } from "next";

import { DebugDisclosure } from "@/components/explorer/debug-disclosure";
import { EmptyState } from "@/components/explorer/empty-state";
import { PageHero } from "@/components/explorer/page-hero";
import { ProfilesList } from "@/components/data/renderers";
import { SectionCard } from "@/components/ui/section-card";
import { ErrorPanel } from "@/components/ui/status-panels";
import { getTrendingProfiles } from "@/lib/api/endpoints";

export const metadata: Metadata = {
  title: "Trending Profiles",
  description: "Ranked profile activity from the NostrMash discovery trending surface.",
};

export default async function TrendingProfilesPage() {
  let errorMessage = "";
  let payload: Awaited<ReturnType<typeof getTrendingProfiles>> | null = null;
  try {
    payload = await getTrendingProfiles("shortTtl");
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : "Failed to load trending profiles.";
  }

  return (
    <div className="space-y-8">
      <PageHero
        title="Trending profiles"
        subtitle="Ranked profiles currently surfacing in discovery outputs."
      />
      {errorMessage ? <ErrorPanel message={errorMessage} /> : null}
      <SectionCard
        title="Ranked profiles"
        description="Rank order is shown directly in each profile card."
      >
        {payload?.profiles && payload.profiles.length > 0 ? (
          <ProfilesList profiles={payload.profiles} ranked />
        ) : (
          <EmptyState message="No profiles currently available." />
        )}
      </SectionCard>
      <DebugDisclosure title="Debug payload" data={payload ?? {}} />
    </div>
  );
}
