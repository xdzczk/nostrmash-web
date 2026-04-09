import { NotesList } from "@/components/data/renderers";
import { SectionCard } from "@/components/ui/section-card";
import { EmptyPanel, ErrorPanel, JsonPanel } from "@/components/ui/status-panels";
import { getTrendingNotes } from "@/lib/api/endpoints";

export default async function TrendingNotesPage() {
  let errorMessage = "";
  let payload: Awaited<ReturnType<typeof getTrendingNotes>> | null = null;
  try {
    payload = await getTrendingNotes("shortTtl");
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : "Failed to load trending notes.";
  }

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-6">
        <h1 className="text-2xl font-semibold tracking-tight">Trending notes</h1>
      </section>
      {errorMessage ? <ErrorPanel message={errorMessage} /> : null}
      <SectionCard title="Notes" description="Current note-level trend ranking output.">
        {payload?.notes && payload.notes.length > 0 ? (
          <NotesList notes={payload.notes} />
        ) : (
          <EmptyPanel message="No notes currently available." />
        )}
      </SectionCard>
      <SectionCard title="Raw payload" description="Full endpoint response for debugging.">
        <JsonPanel data={payload ?? {}} />
      </SectionCard>
    </div>
  );
}
