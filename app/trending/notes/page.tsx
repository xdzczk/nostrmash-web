import type { Metadata } from "next";
import Link from "next/link";

import { DebugDisclosure } from "@/components/explorer/debug-disclosure";
import { EmptyState } from "@/components/explorer/empty-state";
import { NativeSemanticsBadges } from "@/components/explorer/native-semantics-badges";
import { PageHero } from "@/components/explorer/page-hero";
import { NotesList } from "@/components/data/renderers";
import { SectionCard } from "@/components/ui/section-card";
import { ErrorPanel } from "@/components/ui/status-panels";
import { WindowSelector } from "@/components/explorer/window-selector";
import { getTrendingNotes } from "@/lib/api/endpoints";
import { extractEventAuthorPubkeys, fetchProfilesByPubkey } from "@/lib/api/profile-hydration";
import {
  buildContinuationHref,
  readSearchParam,
  toUrlSearchParams,
} from "@/lib/search-params/pagination";
import { formatStatsWindowLabel, readStatsWindow } from "@/lib/search-params/window";
import { extractNativeApiSemantics } from "@/lib/api/normalize";
import type { Profile } from "@/lib/types/api";
import { toUserFacingErrorMessage } from "@/lib/errors/user-message";

export const metadata: Metadata = {
  title: "Trending Notes",
  description: "Explore the notes leading the network.",
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function TrendingNotesPage({ searchParams }: { searchParams: SearchParams }) {
  const resolvedSearchParams = await searchParams;
  const cursor = readSearchParam(resolvedSearchParams, "cursor");
  const window = readStatsWindow(resolvedSearchParams);
  const currentSearchParams = toUrlSearchParams(resolvedSearchParams);
  let errorMessage = "";
  let payload: Awaited<ReturnType<typeof getTrendingNotes>> | null = null;
  let authorsByPubkey: Record<string, Profile> = {};
  try {
    payload = await getTrendingNotes("shortTtl", { cursor, window });
  } catch (error) {
    errorMessage = toUserFacingErrorMessage(error, "Failed to load trending notes.");
  }
  const continuationHref = buildContinuationHref(
    "/trending/notes",
    currentSearchParams,
    "cursor",
    payload?.next_cursor
  );

  if (payload?.notes?.length) {
    try {
      authorsByPubkey = await fetchProfilesByPubkey(
        extractEventAuthorPubkeys(payload.notes ?? []),
        "shortTtl"
      );
    } catch {
      authorsByPubkey = {};
    }
  }
  const semantics = extractNativeApiSemantics(payload);
  const hasSemantics =
    semantics.consistency !== undefined ||
    semantics.trust_mode !== undefined ||
    semantics.trust_applied !== undefined ||
    semantics.result_scope !== undefined;

  return (
    <div className="space-y-8">
      <PageHero
        eyebrow="Ranked notes"
        title="Trending notes"
        subtitle="The notes leading the network."
        badges={
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <WindowSelector
              path="/trending/notes"
              searchParams={currentSearchParams}
              activeWindow={window}
            />
            <span className="border-edge-strong text-ink-dim rounded-full border px-2 py-1">
              {formatStatsWindowLabel(window)}
            </span>
            {hasSemantics ? <NativeSemanticsBadges semantics={semantics} /> : null}
          </div>
        }
      />
      <SectionCard title="Ranked notes" description="The strongest notes in view.">
        {errorMessage ? (
          <ErrorPanel message={errorMessage} />
        ) : payload?.notes && payload.notes.length > 0 ? (
          <NotesList
            notes={payload.notes}
            authorsByPubkey={authorsByPubkey}
            ranked
            discoverySignals
          />
        ) : (
          <EmptyState
            title="No ranked notes yet"
            message="Ranked notes have not populated for this window."
          />
        )}
        {typeof payload?.next_cursor === "string" && payload.next_cursor.length > 0 ? (
          <Link href={continuationHref} className="text-link mt-3 inline-block text-sm">
            Load more notes
          </Link>
        ) : null}
        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          <Link
            href="/discovery/conversations/hot"
            className="border-edge-strong text-ink-dim hover:text-ink rounded-full border px-2.5 py-1"
          >
            Open hot conversations
          </Link>
          <Link
            href="/trending/long-form"
            className="border-edge-strong text-ink-dim hover:text-ink rounded-full border px-2.5 py-1"
          >
            Open trending long-form
          </Link>
        </div>
      </SectionCard>
      <DebugDisclosure title="Debug payload" data={payload ?? {}} />
    </div>
  );
}
