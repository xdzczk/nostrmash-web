import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

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
import { toUserFacingErrorMessage } from "@/lib/errors/user-message";
import { normalizeValidatedDomain } from "@/lib/routing/params";

type Params = Promise<{ domain: string }>;
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function domainTitle(value: string): string {
  return normalizeValidatedDomain(value) ?? "unknown.domain";
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
  const normalizedDomain = normalizeValidatedDomain(domain);
  if (!normalizedDomain) {
    notFound();
  }
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
    errors.push(toUserFacingErrorMessage(error, "Domain notes lookup failed."));
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
              <span className="border-edge-strong text-ink-dim rounded-full border px-2 py-1">
                total: {domainNotesPayload.total.toLocaleString()}
              </span>
            ) : null}
            {typeof notesNextCursor === "string" && notesNextCursor.length > 0 ? (
              <span className="border-edge-strong text-ink-dim rounded-full border px-2 py-1">
                cursor: available
              </span>
            ) : null}
          </div>
        }
        support={
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/domains/${encodeURIComponent(normalizedDomain)}`}
              className="border-edge-strong text-ink-dim hover:text-ink rounded-full border px-3 py-1 text-xs"
            >
              Open domain overview
            </Link>
            <Link
              href={`/search?q=${encodeURIComponent(normalizedDomain)}&tab=notes`}
              className="border-edge-strong text-ink-dim hover:text-ink rounded-full border px-3 py-1 text-xs"
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
              <div className="border-accent/30 bg-accent/10 mt-4 rounded-md border p-3">
                <p className="text-accent-ink text-xs">More notes are available.</p>
                <Link
                  href={notesContinuationHref}
                  className="border-accent/40 text-link-hover hover:text-accent-ink mt-2 inline-block rounded-full border px-3 py-1 text-xs"
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
