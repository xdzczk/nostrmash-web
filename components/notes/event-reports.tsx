import { ReportsDisclosure } from "@/components/reports/reports-disclosure";
import { getEventReports } from "@/lib/api/endpoints";
import type { ReportRecord } from "@/lib/notes/reports";

/** Quiet NIP-56 disclosure. Renders nothing when there are no reports. */
export async function EventReports({ eventId }: { eventId: string }) {
  let reports: ReportRecord[] = [];
  try {
    const payload = await getEventReports(eventId, "shortTtl");
    reports = (payload.reports ?? []) as ReportRecord[];
  } catch {
    return null;
  }
  return <ReportsDisclosure reports={reports} subject="note" />;
}
