import { ReportsDisclosure } from "@/components/reports/reports-disclosure";
import { getUserReports } from "@/lib/api/endpoints";
import type { ReportRecord } from "@/lib/notes/reports";

/** Quiet NIP-56 disclosure for a profile. Renders nothing when there are no reports. */
export async function ProfileReports({ pubkey }: { pubkey: string }) {
  let reports: ReportRecord[] = [];
  try {
    const payload = await getUserReports(pubkey, "shortTtl");
    reports = (payload.reports ?? []) as ReportRecord[];
  } catch {
    return null;
  }
  return <ReportsDisclosure reports={reports} subject="profile" />;
}
