import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { DebugDisclosure } from "@/components/explorer/debug-disclosure";
import { EmptyState } from "@/components/explorer/empty-state";
import { IdBadge } from "@/components/explorer/id-badge";
import { NativeSemanticsBadges } from "@/components/explorer/native-semantics-badges";
import { PageHero } from "@/components/explorer/page-hero";
import { StatCard } from "@/components/explorer/stat-card";
import { NotesList } from "@/components/data/renderers";
import { SectionCard } from "@/components/ui/section-card";
import { ErrorPanel } from "@/components/ui/status-panels";
import { getDomainDetail, getDomainNotes } from "@/lib/api/endpoints";
import { extractNativeApiSemantics } from "@/lib/api/normalize";
import { extractEventAuthorPubkeys, fetchProfilesByPubkey } from "@/lib/api/profile-hydration";
import type { Profile } from "@/lib/types/api";
import { toUserFacingErrorMessage } from "@/lib/errors/user-message";
import { normalizeValidatedDomain } from "@/lib/routing/params";
import { buildEntityMetadata } from "@/lib/seo/metadata";

type Params = Promise<{ domain: string }>;

function domainTitle(value: string): string {
  return normalizeValidatedDomain(value) ?? "unknown.domain";
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { domain } = await params;
  const label = domainTitle(domain);
  return buildEntityMetadata({
    title: label,
    description: `See notes and activity connected to ${label}.`,
    path: `/domains/${encodeURIComponent(label)}`,
  });
}

export default async function DomainPage({ params }: { params: Params }) {
  const { domain } = await params;
  const normalizedDomain = normalizeValidatedDomain(domain);
  if (!normalizedDomain) {
    notFound();
  }
  const errors: string[] = [];
  let domainDetailPayload: Awaited<ReturnType<typeof getDomainDetail>> | null = null;
  let domainNotesPayload: Awaited<ReturnType<typeof getDomainNotes>> | null = null;
  let authorsByPubkey: Record<string, Profile> = {};

  const [detailResult, notesResult] = await Promise.allSettled([
    getDomainDetail(normalizedDomain, "shortTtl"),
    getDomainNotes(normalizedDomain, "shortTtl"),
  ]);

  if (detailResult.status === "fulfilled") {
    domainDetailPayload = detailResult.value;
  } else {
    errors.push(toUserFacingErrorMessage(detailResult.reason, "Domain lookup failed."));
  }
  if (notesResult.status === "fulfilled") {
    domainNotesPayload = notesResult.value;
  } else {
    errors.push(toUserFacingErrorMessage(notesResult.reason, "Domain notes lookup failed."));
  }

  const notes = domainNotesPayload?.notes ?? domainDetailPayload?.notes ?? [];
  const semantics = extractNativeApiSemantics(domainDetailPayload, domainNotesPayload);
  const totalMentions =
    domainDetailPayload?.count ?? domainDetailPayload?.event_count ?? domainNotesPayload?.total;
  const uniqueAuthors = domainDetailPayload?.unique_authors;
  const notesSurfaceBaseHref = `/domains/${encodeURIComponent(normalizedDomain)}/notes`;
  const notesSurfaceHref =
    typeof domainNotesPayload?.next_cursor === "string" && domainNotesPayload.next_cursor.length > 0
      ? `${notesSurfaceBaseHref}?cursor=${encodeURIComponent(domainNotesPayload.next_cursor)}`
      : notesSurfaceBaseHref;

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
        eyebrow="Domain explorer"
        title={domainTitle(normalizedDomain)}
        subtitle="See the notes and activity connected to this domain."
        badges={
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <NativeSemanticsBadges semantics={semantics} />
            <IdBadge id={domainTitle(normalizedDomain)} label="domain" />
            {typeof totalMentions === "number" ? (
              <span className="border-edge-strong text-ink-dim rounded-full border px-2 py-1">
                notes: {totalMentions.toLocaleString()}
              </span>
            ) : null}
            {typeof uniqueAuthors === "number" ? (
              <span className="border-edge-strong text-ink-dim rounded-full border px-2 py-1">
                unique authors: {uniqueAuthors.toLocaleString()}
              </span>
            ) : null}
          </div>
        }
        support={
          <div className="flex flex-wrap gap-2">
            <Link
              href={notesSurfaceHref}
              className="border-edge-strong text-ink-dim hover:text-ink rounded-full border px-3 py-1 text-xs"
            >
              Open full note list
            </Link>
            <Link
              href={`/search?q=${encodeURIComponent(normalizedDomain)}&tab=notes`}
              className="border-edge-strong text-ink-dim hover:text-ink rounded-full border px-3 py-1 text-xs"
            >
              Search this domain
            </Link>
          </div>
        }
      />

      {errors.length > 0 ? <ErrorPanel message={errors.join(" | ")} /> : null}

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {typeof totalMentions === "number" ? (
          <StatCard label="notes" value={totalMentions} />
        ) : null}
        {typeof uniqueAuthors === "number" ? (
          <StatCard label="unique_authors" value={uniqueAuthors} />
        ) : null}
        {typeof domainNotesPayload?.total === "number" ? (
          <StatCard label="notes_total" value={domainNotesPayload.total} />
        ) : null}
      </section>

      <SectionCard title="Notes snapshot" description="A preview of notes linking to this domain.">
        {notes.length > 0 ? (
          <div className="space-y-3">
            <NotesList notes={notes.slice(0, 8)} authorsByPubkey={authorsByPubkey} />
            <Link href={notesSurfaceHref} className="text-link inline-block text-sm">
              Open all domain notes
            </Link>
          </div>
        ) : (
          <EmptyState message={`No notes were returned for ${domainTitle(normalizedDomain)}.`} />
        )}
      </SectionCard>

      <div className="space-y-3">
        <DebugDisclosure title="Debug payload: domain detail" data={domainDetailPayload ?? {}} />
        <DebugDisclosure title="Debug payload: domain notes" data={domainNotesPayload ?? {}} />
      </div>
    </div>
  );
}
