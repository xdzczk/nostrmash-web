import Link from "next/link";
import type { Metadata } from "next";

import { DiscoverShell } from "@/components/discover/discover-shell";
import { LoadMoreList } from "@/components/data/load-more-list";
import { NotesList, ProfilesList } from "@/components/data/renderers";
import { DebugDisclosure } from "@/components/explorer/debug-disclosure";
import { EmptyState } from "@/components/explorer/empty-state";
import { AboutThisData } from "@/components/explorer/about-this-data";
import { SectionCard } from "@/components/ui/section-card";
import { getHotConversations } from "@/lib/api/endpoints";
import { presentConversations } from "@/lib/discover/conversation-order";
import { loadMoreRanking } from "@/lib/explorer/load-more-ranking";
import {
  rankedListRequest,
  rankedPageContinuation,
  readRankedOffset,
} from "@/lib/explorer/ranked-pagination";
import { extractNativeApiSemantics } from "@/lib/api/normalize";
import { extractEventAuthorPubkeys, fetchProfilesByPubkey } from "@/lib/api/profile-hydration";
import { toUserFacingErrorMessage } from "@/lib/errors/user-message";
import {
  buildLanguageHref,
  LANGUAGE_EMPTY_MESSAGE,
  readLanguage,
} from "@/lib/search-params/language";
import { applyDiscoverLanguage } from "@/lib/search-params/language-preference";
import { buildContinuationHref, toUrlSearchParams } from "@/lib/search-params/pagination";
import { readStatsWindow } from "@/lib/search-params/window";
import { withLanguageVariantMetadata } from "@/lib/seo/metadata";
import { formatUpdatedRelative } from "@/lib/time/freshness";
import type { Profile } from "@/lib/types/api";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata({
  searchParams,
}: {
  searchParams: SearchParams;
}): Promise<Metadata> {
  return withLanguageVariantMetadata(
    {
      title: "Conversations",
      description: "Notes driving active conversation right now.",
    },
    readLanguage(await searchParams),
    "/discovery/conversations/hot"
  );
}

export default async function HotConversationsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const path = "/discovery/conversations/hot";
  const resolvedSearchParams = await searchParams;
  const language = await applyDiscoverLanguage(path, resolvedSearchParams);
  const offset = readRankedOffset(resolvedSearchParams);
  const window = readStatsWindow(resolvedSearchParams);
  const currentSearchParams = toUrlSearchParams(resolvedSearchParams);
  let errorMessage = "";
  let payload: Awaited<ReturnType<typeof getHotConversations>> | null = null;
  let authorsByPubkey: Record<string, Profile> = {};
  let activeProfiles: Profile[] = [];

  try {
    payload = await getHotConversations("shortTtl", rankedListRequest(window, language, offset));
  } catch (error) {
    errorMessage = toUserFacingErrorMessage(error, "Failed to load hot conversations.");
  }

  const rawNotes = payload?.notes ?? [];
  const notes = presentConversations(rawNotes);
  const semantics = extractNativeApiSemantics(payload);
  const continuation = rankedPageContinuation("conversations", rawNotes, offset);
  const continuationHref =
    continuation.nextOffset != null
      ? buildContinuationHref(path, currentSearchParams, "offset", String(continuation.nextOffset))
      : undefined;
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
    <DiscoverShell
      view="conversations"
      mode="hot"
      path={path}
      searchParams={currentSearchParams}
      window={window}
      language={language}
      topLanguages={payload?.top_languages}
      freshnessLabel={formatUpdatedRelative(
        (payload as { computed_at?: string | number | null } | null)?.computed_at
      )}
      errorMessage={errorMessage}
      hasContent={notes.length > 0}
      eyebrow=""
      title="Conversations"
      subtitle="Notes driving active threads, so you can move from signal to conversation context quickly."
    >
      <div>
        {notes.length > 0 ? (
          <NotesList
            notes={notes}
            authorsByPubkey={authorsByPubkey}
            ranked
            conversation
            rankOffset={offset}
          />
        ) : !errorMessage ? (
          <EmptyState
            title={language ? undefined : "No hot conversations available"}
            message={
              language
                ? LANGUAGE_EMPTY_MESSAGE
                : "The API did not return conversation entries for this window."
            }
          />
        ) : null}
        {continuation.token ? (
          <>
            <LoadMoreList
              key={continuation.token}
              auto
              initialCursor={continuation.token}
              loadMore={loadMoreRanking.bind(null, "conversations", window, language ?? "")}
              label="Load more conversations"
            />
            {continuationHref ? (
              <noscript>
                <Link href={continuationHref} className="text-link mt-3 inline-block text-sm">
                  Load more conversations
                </Link>
              </noscript>
            ) : null}
          </>
        ) : null}
      </div>

      {!errorMessage && (notes.length > 0 || !language) ? (
        <SectionCard
          title="Conversation participants"
          description="Profiles active in these conversations."
        >
          {activeProfiles.length > 0 ? (
            <ProfilesList profiles={activeProfiles} compact />
          ) : (
            <EmptyState message="No participant profiles were available for this window." />
          )}
          <div className="mt-4 flex flex-wrap gap-2 text-xs">
            <Link
              href={buildLanguageHref(
                "/discovery/profiles/rising",
                new URLSearchParams(),
                language
              )}
              className="border-edge-strong text-ink-dim hover:text-ink rounded-full border px-2.5 py-1"
            >
              Open up and coming
            </Link>
            <Link
              href={buildLanguageHref("/trending/notes", new URLSearchParams(), language)}
              className="border-edge-strong text-ink-dim hover:text-ink rounded-full border px-2.5 py-1"
            >
              See trending notes
            </Link>
          </div>
        </SectionCard>
      ) : null}

      <AboutThisData semantics={semantics} />
      <DebugDisclosure title="Debug payload" data={payload ?? {}} />
    </DiscoverShell>
  );
}
