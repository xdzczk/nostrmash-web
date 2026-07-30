import Link from "next/link";
import type { Metadata } from "next";

import { NotesList, ProfilesList } from "@/components/data/renderers";
import { DebugDisclosure } from "@/components/explorer/debug-disclosure";
import { EmptyState } from "@/components/explorer/empty-state";
import { AboutThisData } from "@/components/explorer/about-this-data";
import { PageHero } from "@/components/explorer/page-hero";
import { DiscoverNav } from "@/components/explorer/discover-nav";
import { SectionCard } from "@/components/ui/section-card";
import { ErrorPanel } from "@/components/ui/status-panels";
import { WindowSelector } from "@/components/explorer/window-selector";
import { getHotConversations } from "@/lib/api/endpoints";
import { extractNativeApiSemantics } from "@/lib/api/normalize";
import { extractEventAuthorPubkeys, fetchProfilesByPubkey } from "@/lib/api/profile-hydration";
import {
  buildContinuationHref,
  readSearchParam,
  toUrlSearchParams,
} from "@/lib/search-params/pagination";
import { formatStatsWindowLabel, readStatsWindow } from "@/lib/search-params/window";
import type { Profile } from "@/lib/types/api";
import { toUserFacingErrorMessage } from "@/lib/errors/user-message";

export const metadata: Metadata = {
  title: "Hot Conversations",
  description: "Notes driving active conversation right now.",
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function HotConversationsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const resolvedSearchParams = await searchParams;
  const cursor = readSearchParam(resolvedSearchParams, "cursor");
  const window = readStatsWindow(resolvedSearchParams);
  const currentSearchParams = toUrlSearchParams(resolvedSearchParams);
  let errorMessage = "";
  let payload: Awaited<ReturnType<typeof getHotConversations>> | null = null;
  let authorsByPubkey: Record<string, Profile> = {};
  let activeProfiles: Profile[] = [];

  try {
    payload = await getHotConversations("shortTtl", { cursor, window });
  } catch (error) {
    errorMessage = toUserFacingErrorMessage(error, "Failed to load hot conversations.");
  }

  const notes = payload?.notes ?? [];
  const semantics = extractNativeApiSemantics(payload);
  const continuationHref = buildContinuationHref(
    "/discovery/conversations/hot",
    currentSearchParams,
    "cursor",
    payload?.next_cursor
  );
  if (notes.length > 0) {
    const authorPubkeys = extractEventAuthorPubkeys(notes);
    if (authorPubkeys.length > 0) {
      try {
        authorsByPubkey = await fetchProfilesByPubkey(authorPubkeys, "shortTtl");
        activeProfiles = Object.values(authorsByPubkey).slice(0, 8);
      } catch {
        authorsByPubkey = {};
        activeProfiles = [];
      }
    }
  }

  return (
    <div className="space-y-8">
      <PageHero
        eyebrow="Discovery depth"
        title="Hot conversations"
        subtitle="Notes driving active threads, so you can move from signal to conversation context quickly."
        badges={
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <WindowSelector
              path="/discovery/conversations/hot"
              searchParams={currentSearchParams}
              activeWindow={window}
            />
            <span className="border-edge-strong text-ink-dim rounded-full border px-2 py-1">
              {formatStatsWindowLabel(window)}
            </span>
          </div>
        }
      />
      <DiscoverNav active="conversations" />

      <SectionCard title="Conversation feed" description="Ranked by live conversation activity.">
        {errorMessage ? (
          <ErrorPanel message={errorMessage} />
        ) : notes.length > 0 ? (
          <NotesList notes={notes} authorsByPubkey={authorsByPubkey} ranked />
        ) : (
          <EmptyState
            title="No hot conversations available"
            message="The API did not return conversation entries for this window."
          />
        )}
        {typeof payload?.next_cursor === "string" && payload.next_cursor.length > 0 ? (
          <Link href={continuationHref} className="text-link mt-3 inline-block text-sm">
            Load more conversations
          </Link>
        ) : null}
      </SectionCard>

      <SectionCard
        title="Conversation participants"
        description="Profiles active in these conversations."
      >
        {activeProfiles.length > 0 ? (
          <ProfilesList profiles={activeProfiles} />
        ) : (
          <EmptyState message="No participant profiles were available for this window." />
        )}
        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          <Link
            href="/discovery/profiles/rising"
            className="border-edge-strong text-ink-dim hover:text-ink rounded-full border px-2.5 py-1"
          >
            Open rising profiles
          </Link>
          <Link
            href="/trending/notes"
            className="border-edge-strong text-ink-dim hover:text-ink rounded-full border px-2.5 py-1"
          >
            See trending notes
          </Link>
        </div>
      </SectionCard>

      <AboutThisData semantics={semantics} />
      <DebugDisclosure title="Debug payload" data={payload ?? {}} />
    </div>
  );
}
