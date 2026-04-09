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
        eyebrow="Ranked profiles"
        title="Trending profiles"
        subtitle="Ranked profiles currently surfacing in discovery outputs."
      />
      <SectionCard
        title="Ranked profiles"
        description="Profiles are structured for scan-first ranking and compact metrics."
      >
        {errorMessage ? (
          <ErrorPanel message={errorMessage} />
        ) : payload?.profiles && payload.profiles.length > 0 ? (
          <ProfilesList profiles={payload.profiles} ranked />
        ) : (
          <EmptyState
            title="No profile ranking available"
            message="The API did not return ranked profiles for the current trend window."
          />
        )}
      </SectionCard>
      <DebugDisclosure title="Debug payload" data={payload ?? {}} />
    </div>
  );
}
