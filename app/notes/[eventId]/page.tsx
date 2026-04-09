import { SectionCard } from "@/components/ui/section-card";
import { ErrorPanel, JsonPanel } from "@/components/ui/status-panels";
import { getEvent, getNoteSummary, getThread } from "@/lib/api/endpoints";

type Params = Promise<{ eventId: string }>;

export default async function NotePage({ params }: { params: Params }) {
  const { eventId } = await params;

  let errorMessage = "";
  let eventPayload: Awaited<ReturnType<typeof getEvent>> | null = null;
  let noteSummary: Awaited<ReturnType<typeof getNoteSummary>> | null = null;
  let threadPayload: Awaited<ReturnType<typeof getThread>> | null = null;

  try {
    [eventPayload, noteSummary, threadPayload] = await Promise.all([
      getEvent(eventId, "requestTime"),
      getNoteSummary(eventId, "requestTime"),
      getThread(eventId, "requestTime"),
    ]);
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : "Failed to load note details.";
  }

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-6">
        <h1 className="text-2xl font-semibold tracking-tight">Note</h1>
        <p className="mt-1 break-all text-sm text-zinc-300">{eventId}</p>
      </section>

      {errorMessage ? <ErrorPanel message={errorMessage} /> : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard title="Canonical event" description="Primary event payload and provenance.">
          <JsonPanel data={eventPayload ?? {}} />
        </SectionCard>
        <SectionCard title="Note summary" description="Aggregated summary fields for this note.">
          <JsonPanel data={noteSummary ?? {}} />
        </SectionCard>
      </div>

      <SectionCard title="Thread view" description="Ancestors and replies around this event.">
        <JsonPanel data={threadPayload ?? {}} />
      </SectionCard>
    </div>
  );
}
