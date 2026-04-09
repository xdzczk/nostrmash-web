import { HashtagsList } from "@/components/data/renderers";
import { SectionCard } from "@/components/ui/section-card";
import { EmptyPanel, ErrorPanel, JsonPanel } from "@/components/ui/status-panels";
import { getTrendingHashtags } from "@/lib/api/endpoints";

export default async function TrendingHashtagsPage() {
  let errorMessage = "";
  let payload: Awaited<ReturnType<typeof getTrendingHashtags>> | null = null;
  try {
    payload = await getTrendingHashtags("shortTtl");
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : "Failed to load trending hashtags.";
  }

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-6">
        <h1 className="text-2xl font-semibold tracking-tight">Trending hashtags</h1>
      </section>
      {errorMessage ? <ErrorPanel message={errorMessage} /> : null}
      <SectionCard title="Hashtags" description="Current hashtag trend ranking output.">
        {payload?.hashtags && payload.hashtags.length > 0 ? (
          <HashtagsList hashtags={payload.hashtags} />
        ) : (
          <EmptyPanel message="No hashtags currently available." />
        )}
      </SectionCard>
      <SectionCard title="Raw payload" description="Full endpoint response for debugging.">
        <JsonPanel data={payload ?? {}} />
      </SectionCard>
    </div>
  );
}
