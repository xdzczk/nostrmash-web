import Link from "next/link";
import type { Metadata } from "next";

import { NotesList, ProfilesList } from "@/components/data/renderers";
import { DebugDisclosure } from "@/components/explorer/debug-disclosure";
import { EmptyState } from "@/components/explorer/empty-state";
import { NativeSemanticsBadges } from "@/components/explorer/native-semantics-badges";
import { PageHero } from "@/components/explorer/page-hero";
import { SectionCard } from "@/components/ui/section-card";
import { ErrorPanel } from "@/components/ui/status-panels";
import { getHotConversations } from "@/lib/api/endpoints";
import { extractNativeApiSemantics } from "@/lib/api/normalize";
import { extractEventAuthorPubkeys, fetchProfilesByPubkey } from "@/lib/api/profile-hydration";
import {
  buildContinuationHref,
  readSearchParam,
  toUrlSearchParams,
} from "@/lib/search-params/pagination";
import type { Profile } from "@/lib/types/api";

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
  const currentSearchParams = toUrlSearchParams(resolvedSearchParams);
  let errorMessage = "";
  let payload: Awaited<ReturnType<typeof getHotConversations>> | null = null;
  let authorsByPubkey: Record<string, Profile> = {};
  let activeProfiles: Profile[] = [];

  try {
    payload = await getHotConversations("shortTtl", { cursor });
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : "Failed to load hot conversations.";
  }

  const notes = payload?.notes ?? [];
  const semantics = extractNativeApiSemantics(payload);
  const hasSemantics =
    semantics.consistency !== undefined ||
    semantics.trust_mode !== undefined ||
    semantics.trust_applied !== undefined ||
    semantics.result_scope !== undefined;
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
          hasSemantics ? (
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <NativeSemanticsBadges semantics={semantics} />
            </div>
          ) : undefined
        }
      />

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
          <Link href={continuationHref} className="mt-3 inline-block text-sm text-indigo-300">
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
            className="rounded-full border border-zinc-700 px-2.5 py-1 text-zinc-300 hover:text-zinc-100"
          >
            Open rising profiles
          </Link>
          <Link
            href="/trending/notes"
            className="rounded-full border border-zinc-700 px-2.5 py-1 text-zinc-300 hover:text-zinc-100"
          >
            See trending notes
          </Link>
        </div>
      </SectionCard>

      <DebugDisclosure title="Debug payload" data={payload ?? {}} />
    </div>
  );
}
