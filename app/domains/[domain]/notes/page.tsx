import type { Metadata } from "next";
import Link from "next/link";

import { DebugDisclosure } from "@/components/explorer/debug-disclosure";
import { EmptyState } from "@/components/explorer/empty-state";
import { IdBadge } from "@/components/explorer/id-badge";
import { NativeSemanticsBadges } from "@/components/explorer/native-semantics-badges";
import { PageHero } from "@/components/explorer/page-hero";
import { NotesList } from "@/components/data/renderers";
import { SectionCard } from "@/components/ui/section-card";
import { ErrorPanel } from "@/components/ui/status-panels";
import { getDomainNotes } from "@/lib/api/endpoints";
import { extractNativeApiSemantics } from "@/lib/api/normalize";
import { extractEventAuthorPubkeys, fetchProfilesByPubkey } from "@/lib/api/profile-hydration";
import {
  buildContinuationHref,
  readSearchParam,
  toUrlSearchParams,
} from "@/lib/search-params/pagination";
import type { Profile } from "@/lib/types/api";

type Params = Promise<{ domain: string }>;
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function normalizeDomainParam(value: string): string {
  const decoded = decodeURIComponent(value).trim().toLowerCase();
  if (decoded.length === 0) return "";
  const candidate = decoded.includes("://") ? decoded : `https://${decoded}`;
  try {
    return new URL(candidate).hostname.toLowerCase().replace(/\.$/, "");
  } catch {
    const hostname = decoded
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .split("/")[0];
    return (hostname ?? "").replace(/\.$/, "");
  }
}

function domainTitle(value: string): string {
  const normalized = normalizeDomainParam(value);
  return normalized.length > 0 ? normalized : "unknown.domain";
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { domain } = await params;
  const label = domainTitle(domain);
  return {
    title: `${label} notes`,
    description: `NostrMash note explorer for ${label}.`,
  };
}

export default async function DomainNotesPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { domain } = await params;
  const normalizedDomain = normalizeDomainParam(domain);
  const resolvedSearchParams = await searchParams;
  const notesCursor = readSearchParam(resolvedSearchParams, "cursor");
  const currentSearchParams = toUrlSearchParams(resolvedSearchParams);
  const errors: string[] = [];
  let domainNotesPayload: Awaited<ReturnType<typeof getDomainNotes>> | null = null;
  let authorsByPubkey: Record<string, Profile> = {};

  try {
    domainNotesPayload = await getDomainNotes(normalizedDomain, "shortTtl", {
      cursor: notesCursor,
    });
  } catch (error) {
    errors.push(error instanceof Error ? error.message : "Domain notes lookup failed.");
  }

  const notes = domainNotesPayload?.notes ?? [];
  const notesNextCursor = domainNotesPayload?.next_cursor;
  const notesContinuationHref = buildContinuationHref(
    `/domains/${encodeURIComponent(normalizedDomain)}/notes`,
    currentSearchParams,
    "cursor",
    notesNextCursor
  );
  const semantics = extractNativeApiSemantics(domainNotesPayload);

  if (notes.length > 0) {
    try {
      authorsByPubkey = await fetchProfilesByPubkey(extractEventAuthorPubkeys(notes), "shortTtl");
    } catch {
      authorsByPubkey = {};
    }
  }

  return (
    <div className="space-y-8">
      <PageHero
        eyebrow="Domain notes"
        title={`${domainTitle(normalizedDomain)} notes`}
        subtitle="All available notes returned by the domain notes endpoint."
        badges={
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <NativeSemanticsBadges semantics={semantics} />
            <IdBadge id={domainTitle(normalizedDomain)} label="domain" />
            {typeof domainNotesPayload?.total === "number" ? (
              <span className="rounded-full border border-zinc-700 px-2 py-1 text-zinc-300">
                total: {domainNotesPayload.total.toLocaleString()}
              </span>
            ) : null}
            {typeof notesNextCursor === "string" && notesNextCursor.length > 0 ? (
              <span className="rounded-full border border-zinc-700 px-2 py-1 text-zinc-300">
                cursor: available
              </span>
            ) : null}
          </div>
        }
        support={
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/domains/${encodeURIComponent(normalizedDomain)}`}
              className="rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-300 hover:text-zinc-100"
            >
              Open domain overview
            </Link>
            <Link
              href={`/search?q=${encodeURIComponent(normalizedDomain)}&tab=notes`}
              className="rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-300 hover:text-zinc-100"
            >
              Search domain notes
            </Link>
          </div>
        }
      />

      {errors.length > 0 ? <ErrorPanel message={errors.join(" | ")} /> : null}

      <SectionCard title="Domain notes" description="Notes linking to this domain.">
        {notes.length > 0 ? (
          <>
            <NotesList notes={notes} authorsByPubkey={authorsByPubkey} />
            {typeof notesNextCursor === "string" && notesNextCursor.length > 0 ? (
              <div className="mt-4 rounded-md border border-indigo-500/30 bg-indigo-500/10 p-3">
                <p className="text-xs text-indigo-100">More notes are available.</p>
                <Link
                  href={notesContinuationHref}
                  className="mt-2 inline-block rounded-full border border-indigo-500/40 px-3 py-1 text-xs text-indigo-200 hover:text-indigo-100"
                >
                  Continue notes
                </Link>
              </div>
            ) : null}
          </>
        ) : (
          <EmptyState message={`No notes were returned for ${domainTitle(normalizedDomain)}.`} />
        )}
      </SectionCard>

      <DebugDisclosure title="Debug payload: domain notes" data={domainNotesPayload ?? {}} />
    </div>
  );
}
