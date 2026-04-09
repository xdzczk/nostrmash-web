import type { Metadata } from "next";

import { DebugDisclosure } from "@/components/explorer/debug-disclosure";
import { EmptyState } from "@/components/explorer/empty-state";
import { PageHero } from "@/components/explorer/page-hero";
import { NotesList } from "@/components/data/renderers";
import { SectionCard } from "@/components/ui/section-card";
import { ErrorPanel } from "@/components/ui/status-panels";
import { getProfilesBatch, getTrendingNotes } from "@/lib/api/endpoints";
import type { Profile } from "@/lib/types/api";

export const metadata: Metadata = {
  title: "Trending Notes",
  description: "Ranked note activity from the NostrMash discovery trending surface.",
};

export default async function TrendingNotesPage() {
  let errorMessage = "";
  let payload: Awaited<ReturnType<typeof getTrendingNotes>> | null = null;
  let authorsByPubkey: Record<string, Profile> = {};
  try {
    payload = await getTrendingNotes("shortTtl");
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : "Failed to load trending notes.";
  }

  if (payload?.notes?.length) {
    try {
      const authors = await getProfilesBatch(
        (payload.notes ?? [])
          .map((note) => note.pubkey)
          .filter((pubkey): pubkey is string => typeof pubkey === "string"),
        "shortTtl"
      );
      authorsByPubkey = Object.fromEntries(
        authors
          .filter((profile) => typeof profile.pubkey === "string" && profile.pubkey.length > 0)
          .map((profile) => [profile.pubkey.toLowerCase(), profile])
      );
    } catch {
      authorsByPubkey = {};
    }
  }

  return (
    <div className="space-y-8">
      <PageHero
        eyebrow="Ranked notes"
        title="Trending notes"
        subtitle="Ranked notes currently surfacing in NostrMash trend windows."
      />
      <SectionCard
        title="Ranked notes"
        description="Cards are weighted to emphasize the strongest current entries."
      >
        {errorMessage ? (
          <ErrorPanel message={errorMessage} />
        ) : payload?.notes && payload.notes.length > 0 ? (
          <NotesList notes={payload.notes} authorsByPubkey={authorsByPubkey} ranked />
        ) : (
          <EmptyState
            title="No note ranking available"
            message="The API did not return ranked notes for the current trend window."
          />
        )}
      </SectionCard>
      <DebugDisclosure title="Debug payload" data={payload ?? {}} />
    </div>
  );
}
