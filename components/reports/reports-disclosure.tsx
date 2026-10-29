import Link from "next/link";

import { Timestamp } from "@/components/explorer/timestamp";
import { profileHref, truncateIdentifier } from "@/components/explorer/utils";
import { reportTypeLabel, type ReportRecord } from "@/lib/notes/reports";
import { Disclosure } from "@/components/ui/disclosure";

export function ReportsDisclosure({
  reports,
  subject,
}: {
  reports: ReportRecord[];
  subject: "note" | "profile";
}) {
  if (reports.length === 0) return null;
  const title = reports.length === 1 ? "1 report" : `${reports.length} reports`;

  return (
    <Disclosure
      title={title}
      description={`Reports filed against this ${subject}.`}
      className="mt-4"
    >
      <ul className="space-y-3">
        {reports.map((report, index) => {
          const reporter = report.reporter_pubkey;
          const href = reporter ? profileHref(undefined, reporter) : undefined;
          const label = reporter
            ? truncateIdentifier(reporter, "pubkey", "secondary")
            : "Unknown reporter";
          return (
            <li key={report.id ?? `${reporter ?? "report"}:${index}`} className="text-sm">
              <p className="text-ink-soft font-medium">{reportTypeLabel(report.report_type)}</p>
              <p className="text-ink-faint mt-0.5 text-xs">
                {href ? (
                  <Link href={href} className="hover:text-ink-soft">
                    {label}
                  </Link>
                ) : (
                  label
                )}
                {typeof report.created_at === "number" ? (
                  <>
                    {" "}
                    <Timestamp unixSeconds={report.created_at} />
                  </>
                ) : null}
              </p>
              {report.content ? (
                <p className="text-ink-dim mt-1 leading-6 whitespace-pre-wrap">{report.content}</p>
              ) : null}
            </li>
          );
        })}
      </ul>
    </Disclosure>
  );
}
