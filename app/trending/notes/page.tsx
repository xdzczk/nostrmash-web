import type { Metadata } from "next";

import { DebugDisclosure } from "@/components/explorer/debug-disclosure";
import { EmptyState } from "@/components/explorer/empty-state";
import { PageHero } from "@/components/explorer/page-hero";
import { NotesList } from "@/components/data/renderers";
import { SectionCard } from "@/components/ui/section-card";
import { ErrorPanel } from "@/components/ui/status-panels";
import { getTrendingNotes } from "@/lib/api/endpoints";

export const metadata: Metadata = {
  title: "Trending Notes",
  description: "Ranked note activity from the NostrMash discovery trending surface.",
};

export default async function TrendingNotesPage() {
  let errorMessage = "";
  let payload: Awaited<ReturnType<typeof getTrendingNotes>> | null = null;
  try {
    payload = await getTrendingNotes("shortTtl");
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : "Failed to load trending notes.";
  }

  return (
    <div className="space-y-8">
      <PageHero
        title="Trending notes"
        subtitle="Ranked notes currently surfacing in NostrMash trend windows."
      />
      {errorMessage ? <ErrorPanel message={errorMessage} /> : null}
      <SectionCard
        title="Ranked notes"
        description="Rank order is displayed directly in each card."
      >
        {payload?.notes && payload.notes.length > 0 ? (
          <NotesList notes={payload.notes} ranked />
        ) : (
          <EmptyState message="No notes currently available." />
        )}
      </SectionCard>
      <DebugDisclosure title="Debug payload" data={payload ?? {}} />
    </div>
  );
}
