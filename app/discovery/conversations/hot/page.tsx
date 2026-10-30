import Link from "next/link";
import type { Metadata } from "next";
import { Suspense } from "react";
import { unstable_rethrow } from "next/navigation";

import { LoadMoreList } from "@/components/data/load-more-list";
import { NotesList, ProfilesList } from "@/components/data/renderers";
import { DebugDisclosure } from "@/components/explorer/debug-disclosure";
import { EmptyState } from "@/components/explorer/empty-state";
import { AboutThisData } from "@/components/explorer/about-this-data";
import { FreshnessBadge } from "@/components/discover/discover-shell";
import {
  RankedLanguageControl,
  RankedListChrome,
  RankedListStatus,
} from "@/components/explorer/ranked-list-page";
import { NotesListSkeleton } from "@/components/ui/skeleton";
import { SectionCard } from "@/components/ui/section-card";
import { getHotConversations } from "@/lib/api/endpoints";
import { presentConversations } from "@/lib/discover/conversation-order";
import {
  isDiscovery30dHidden,
  requestDiscovery,
  syncDiscoveryWindow,
} from "@/lib/discover/window-fallback";
import { loadMoreRanking } from "@/lib/explorer/load-more-ranking";
import {
  rankedListRequest,
  rankedPageContinuation,
  readRankedOffset,
} from "@/lib/explorer/ranked-pagination";
import { extractNativeApiSemantics } from "@/lib/api/normalize";
import { extractEventAuthorPubkeys, fetchProfilesByPubkey } from "@/lib/api/profile-hydration";
import { startRankedLoad } from "@/lib/explorer/ranked-list";
import { toUserFacingErrorMessage } from "@/lib/errors/user-message";
import {
  buildLanguageHref,
  LANGUAGE_EMPTY_MESSAGE,
  readLanguage,
} from "@/lib/search-params/language";
import { applyDiscoverLanguage } from "@/lib/search-params/language-preference";
import { buildContinuationHref, toUrlSearchParams } from "@/lib/search-params/pagination";
import {
  readStatsWindow,
  selectableStatsWindows,
  type StatsWindow,
} from "@/lib/search-params/window";
import { withLanguageVariantMetadata } from "@/lib/seo/metadata";
import { formatUpdatedRelative } from "@/lib/time/freshness";
import type { HotConversationsResponse, Profile } from "@/lib/types/api";

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
  await syncDiscoveryWindow(path, resolvedSearchParams);
  const window = readStatsWindow(resolvedSearchParams);
  const windows = selectableStatsWindows(!(await isDiscovery30dHidden()));
  const currentSearchParams = toUrlSearchParams(resolvedSearchParams);
  const data = startRankedLoad(
    loadHotConversations(window, path, currentSearchParams, language, offset)
  );
  const query = currentSearchParams.toString();

  return (
    <RankedListChrome
      discoverView="notes"
      discoverMode="conversations"
      eyebrow=""
      title="Conversations"
      subtitle="Notes driving active threads, so you can move from signal to conversation context quickly."
      path={path}
      searchParams={currentSearchParams}
      window={window}
      windows={windows}
      language={language}
      languageControl={
        <RankedLanguageControl
          data={data}
          path={path}
          query={query}
          language={language}
          window={window}
        />
      }
      freshness={
        <Suspense fallback={null}>
          <ConversationFreshness data={data} />
        </Suspense>
      }
    >
      <Suspense
        fallback={
          <div>
            <span className="sr-only" role="status">
              Loading this ranking
            </span>
            <NotesListSkeleton />
          </div>
        }
      >
        <HotConversationsBody
          data={data}
          path={path}
          searchParams={currentSearchParams}
          window={window}
          language={language}
          offset={offset}
        />
      </Suspense>
    </RankedListChrome>
  );
}

async function loadHotConversations(
  window: StatsWindow,
  path: string,
  searchParams: URLSearchParams,
  language: string | undefined,
  offset: number
): Promise<{ payload: HotConversationsResponse | null; errorMessage: string }> {
  try {
    const payload = await requestDiscovery(window, path, searchParams, (activeWindow) =>
      getHotConversations("shortTtl", rankedListRequest(activeWindow, language, offset))
    );
    return { payload, errorMessage: "" };
  } catch (error) {
    unstable_rethrow(error);
    return {
      payload: null,
      errorMessage: toUserFacingErrorMessage(error, "Failed to load hot conversations."),
    };
  }
}

async function ConversationFreshness({
  data,
}: {
  data: Promise<{ payload: HotConversationsResponse | null }>;
}) {
  const { payload } = await data;
  const label = formatUpdatedRelative(payload?.computed_at);
  return label ? <FreshnessBadge label={label} /> : null;
}

async function HotConversationsBody({
  data,
  path,
  searchParams,
  window,
  language,
  offset,
}: {
  data: Promise<{ payload: HotConversationsResponse | null; errorMessage: string }>;
  path: string;
  searchParams: URLSearchParams;
  window: StatsWindow;
  language?: string;
  offset: number;
}) {
  const { payload, errorMessage } = await data;
  const rawNotes = payload?.notes ?? [];
  const notes = presentConversations(rawNotes);
  const semantics = extractNativeApiSemantics(payload);
  const continuation = rankedPageContinuation("conversations", rawNotes, offset);
  const continuationHref =
    continuation.nextOffset != null
      ? buildContinuationHref(path, searchParams, "offset", String(continuation.nextOffset))
      : undefined;

  let authorsByPubkey: Record<string, Profile> = {};
  let activeProfiles: Profile[] = [];
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
    <>
      <RankedListStatus
        errorMessage={errorMessage}
        hasItems={notes.length > 0}
        path={path}
        searchParams={searchParams}
      />
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
    </>
  );
}
