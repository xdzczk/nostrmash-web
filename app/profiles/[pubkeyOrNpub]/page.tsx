import type { Metadata } from "next";

import { DebugDisclosure } from "@/components/explorer/debug-disclosure";
import { MetadataList } from "@/components/explorer/metadata-list";
import { PageHero } from "@/components/explorer/page-hero";
import { ProfileCard } from "@/components/explorer/profile-card";
import { StatCard } from "@/components/explorer/stat-card";
import { buildMetadataEntries, extractPrimitiveStats, isRecord } from "@/components/explorer/utils";
import { SectionCard } from "@/components/ui/section-card";
import { ErrorPanel } from "@/components/ui/status-panels";
import { getProfileSummary } from "@/lib/api/endpoints";
import type { Profile } from "@/lib/types/api";

type Params = Promise<{ pubkeyOrNpub: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { pubkeyOrNpub } = await params;
  try {
    const summary = await getProfileSummary(pubkeyOrNpub, "requestTime");
    const profile = summary.profile ?? (summary as unknown as Profile);
    const label =
      profile.display_name ?? profile.name ?? profile.npub ?? profile.pubkey ?? pubkeyOrNpub;
    return {
      title: label,
      description: `NostrMash profile explorer page for ${label}.`,
    };
  } catch {
    return {
      title: `Profile ${pubkeyOrNpub}`,
      description: `NostrMash profile explorer page for ${pubkeyOrNpub}.`,
    };
  }
}

export default async function ProfilePage({ params }: { params: Params }) {
  const { pubkeyOrNpub } = await params;
  let errorMessage = "";
  let summary: Awaited<ReturnType<typeof getProfileSummary>> | null = null;

  try {
    summary = await getProfileSummary(pubkeyOrNpub, "requestTime");
  } catch (error) {
    errorMessage =
      error instanceof Error ? error.message : "Failed to load profile and public summary.";
  }
  const profile = summary ? (summary.profile ?? (summary as unknown as Profile)) : null;

  const summaryStats = extractPrimitiveStats(summary ?? {}, ["pubkey", "consistency"]).slice(0, 6);
  const details = profile
    ? buildMetadataEntries(profile as Record<string, unknown>, [
        "pubkey",
        "npub",
        "name",
        "display_name",
        "website",
        "nip05",
        "lud16",
      ])
    : [];
  const timestamps = profile
    ? buildMetadataEntries(profile as Record<string, unknown>, [
        "created_at",
        "updated_at",
        "last_seen",
      ])
    : [];

  return (
    <div className="space-y-8">
      <PageHero
        title={profile?.display_name ?? profile?.name ?? "Profile explorer"}
        subtitle={
          profile?.about ??
          "Inspect profile identity, summary metrics, and metadata from NostrMash."
        }
      />

      {errorMessage ? <ErrorPanel message={errorMessage} /> : null}

      {profile ? (
        <SectionCard title="Profile" description="Primary profile identity surface.">
          <ProfileCard profile={profile} summary={isRecord(summary) ? summary : undefined} />
        </SectionCard>
      ) : null}

      {summaryStats.length > 0 ? (
        <section className="space-y-3">
          <p className="text-sm font-medium text-zinc-300">Summary metrics</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {summaryStats.map((stat) => (
              <StatCard key={stat.label} label={stat.label} value={stat.value} />
            ))}
          </div>
        </section>
      ) : null}

      {details.length > 0 ? (
        <SectionCard title="Profile details" description="Identifiers and public metadata fields.">
          <MetadataList items={details} columns={2} />
        </SectionCard>
      ) : null}

      {timestamps.length > 0 ? (
        <SectionCard title="Freshness" description="Any timestamp fields returned by the backend.">
          <MetadataList items={timestamps} columns={2} />
        </SectionCard>
      ) : null}

      <div className="space-y-3">
        <DebugDisclosure title="Debug payload: profile" data={profile ?? {}} />
        <DebugDisclosure title="Debug payload: summary" data={summary ?? {}} />
      </div>
    </div>
  );
}
