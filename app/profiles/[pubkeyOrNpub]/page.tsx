import { SectionCard } from "@/components/ui/section-card";
import { ErrorPanel, JsonPanel } from "@/components/ui/status-panels";
import { getProfile, getProfileSummary } from "@/lib/api/endpoints";

type Params = Promise<{ pubkeyOrNpub: string }>;

export default async function ProfilePage({ params }: { params: Params }) {
  const { pubkeyOrNpub } = await params;
  let errorMessage = "";
  let profile: Awaited<ReturnType<typeof getProfile>> | null = null;
  let summary: Awaited<ReturnType<typeof getProfileSummary>> | null = null;

  try {
    profile = await getProfile(pubkeyOrNpub, "requestTime");
    summary = await getProfileSummary(pubkeyOrNpub, "requestTime");
  } catch (error) {
    errorMessage =
      error instanceof Error ? error.message : "Failed to load profile and public summary.";
  }

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-6">
        <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>
        <p className="mt-1 break-all text-sm text-zinc-300">{pubkeyOrNpub}</p>
      </section>

      {errorMessage ? <ErrorPanel message={errorMessage} /> : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard title="Profile payload" description="Canonical profile response from API.">
          <JsonPanel data={profile ?? {}} />
        </SectionCard>
        <SectionCard title="Public summary" description="Counts and summary-level activity fields.">
          <JsonPanel data={summary ?? {}} />
        </SectionCard>
      </div>
    </div>
  );
}
