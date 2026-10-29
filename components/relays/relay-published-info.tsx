import Link from "next/link";

import { SectionCard } from "@/components/ui/section-card";
import {
  nip11FailureMessage,
  publishedInfoRows,
  publishedText,
  relayPublishedTitle,
  type RelayPublishedRow,
} from "@/lib/relays/nip11";
import type { Nip11Document } from "@/lib/types/api";

function RowValue({ row }: { row: RelayPublishedRow }) {
  if (row.lines && row.lines.length > 0) {
    return (
      <ul className="space-y-1">
        {row.lines.map((line, index) => (
          <li key={`${row.id}-${index}`}>{line}</li>
        ))}
      </ul>
    );
  }
  if (row.href && row.external) {
    return (
      <a
        href={row.href}
        rel="noopener noreferrer nofollow"
        target="_blank"
        className="text-link hover:text-link-hover"
      >
        {row.text}
      </a>
    );
  }
  if (row.href) {
    return (
      <Link
        href={row.href}
        className="text-link hover:text-link-hover font-mono text-[13px] break-all"
      >
        {row.text}
      </Link>
    );
  }
  return row.text;
}

/**
 * What the relay published about itself. Omitted when no fetch has completed.
 * A failed fetch is one quiet line, without the error code.
 */
export function RelayPublishedInfo({ nip11 }: { nip11: Nip11Document | null }) {
  if (!nip11) return null;
  if (!nip11.ok) {
    return <p className="text-ink-muted text-sm">{nip11FailureMessage(nip11.error)}</p>;
  }

  const rows = publishedInfoRows(nip11.info);
  if (rows.length === 0 && !publishedText(nip11.info?.name)) return null;

  return (
    <SectionCard
      title={relayPublishedTitle(nip11.info?.name)}
      description="What this relay publishes about itself. It is separate from the connection check and the indexed-volume ranking."
    >
      {rows.length > 0 ? (
        <dl className="grid gap-4 sm:grid-cols-2">
          {rows.map((row) => (
            <div key={row.id} className={row.wide ? "sm:col-span-2" : undefined}>
              <dt className="text-ink-faint text-xs">{row.label}</dt>
              <dd
                className={`text-ink mt-1 text-sm leading-6 [overflow-wrap:anywhere] ${
                  row.id === "description" ? "whitespace-pre-line" : ""
                }`}
              >
                <RowValue row={row} />
              </dd>
            </div>
          ))}
        </dl>
      ) : null}
    </SectionCard>
  );
}
