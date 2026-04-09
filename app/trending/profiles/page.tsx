import { ProfilesList } from "@/components/data/renderers";
import { SectionCard } from "@/components/ui/section-card";
import { EmptyPanel, ErrorPanel, JsonPanel } from "@/components/ui/status-panels";
import { getTrendingProfiles } from "@/lib/api/endpoints";

export default async function TrendingProfilesPage() {
  let errorMessage = "";
  let payload: Awaited<ReturnType<typeof getTrendingProfiles>> | null = null;
  try {
    payload = await getTrendingProfiles("shortTtl");
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : "Failed to load trending profiles.";
  }

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-6">
        <h1 className="text-2xl font-semibold tracking-tight">Trending profiles</h1>
      </section>
      {errorMessage ? <ErrorPanel message={errorMessage} /> : null}
      <SectionCard title="Profiles" description="Current profile trend ranking output.">
        {payload?.profiles && payload.profiles.length > 0 ? (
          <ProfilesList profiles={payload.profiles} />
        ) : (
          <EmptyPanel message="No profiles currently available." />
        )}
      </SectionCard>
      <SectionCard title="Raw payload" description="Full endpoint response for debugging.">
        <JsonPanel data={payload ?? {}} />
      </SectionCard>
    </div>
  );
}
