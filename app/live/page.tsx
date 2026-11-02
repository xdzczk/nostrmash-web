import type { Metadata } from "next";

import { NotesList } from "@/components/data/renderers";
import { RankedListPage } from "@/components/explorer/ranked-list-page";
import { getLiveActivities } from "@/lib/api/endpoints";
import { isApiError } from "@/lib/api/errors";
import { extractNativeApiSemantics } from "@/lib/api/normalize";
import { extractEventAuthorPubkeys, fetchProfilesByPubkey } from "@/lib/api/profile-hydration";
import { toUserFacingErrorMessage } from "@/lib/errors/user-message";
import { eventPageHref } from "@/lib/notes/kinds";
import { getLivePresentation, rankLiveActivities } from "@/lib/notes/live-activity";
import { buildEntityMetadata } from "@/lib/seo/metadata";
import { DEFAULT_STATS_WINDOW } from "@/lib/search-params/window";
import { getRequestNowMs } from "@/lib/time/request-now";
import type { EventRecord, Profile } from "@/lib/types/api";

export const metadata: Metadata = buildEntityMetadata({
  title: "Live",
  description: "Live activities on Nostr right now, ordered by current viewers and engagement.",
  path: "/live",
});

function isMissingRoute(error: unknown): boolean {
  if (isApiError(error) && error.isNotFound) return true;
  return error instanceof Error && /API 404:/i.test(error.message);
}

export default async function LivePage() {
  let events: EventRecord[] = [];
  let errorMessage = "";
  let payload: Awaited<ReturnType<typeof getLiveActivities>> | null = null;
  try {
    payload = await getLiveActivities("live", "shortTtl", { limit: 100 });
    events = rankLiveActivities(payload.events ?? [], Math.floor(getRequestNowMs() / 1000));
  } catch (error) {
    if (!isMissingRoute(error)) {
      errorMessage = toUserFacingErrorMessage(error, "Failed to load live activities.");
    }
  }

  let authorsByPubkey: Record<string, Profile> = {};
  const pubkeys = [
    ...extractEventAuthorPubkeys(events),
    ...events.flatMap(
      (event) =>
        getLivePresentation(event)?.participants.map((participant) => participant.pubkey) ?? []
    ),
  ];
  if (pubkeys.length > 0) {
    try {
      authorsByPubkey = await fetchProfilesByPubkey(pubkeys, "shortTtl");
    } catch {
      authorsByPubkey = {};
    }
  }

  const itemListUrls = events
    .map((event) => eventPageHref(event))
    .filter((href): href is string => Boolean(href));

  return (
    <RankedListPage
      discoverView="media"
      discoverMode="live"
      eyebrow=""
      title="Live"
      subtitle="Streams that are on the air now, ordered by current viewers, then engagement. Playback keeps going while you browse."
      path="/live"
      searchParams={new URLSearchParams()}
      window={DEFAULT_STATS_WINDOW}
      rankingControls={false}
      rememberWindow={false}
      semantics={extractNativeApiSemantics(payload)}
      errorMessage={errorMessage}
      emptyTitle=""
      emptyMessage="No live activities are in the index right now."
      hasItems={events.length > 0}
      debugPayload={payload ?? {}}
      itemListUrls={itemListUrls}
    >
      <NotesList notes={events} authorsByPubkey={authorsByPubkey} showUtilityLinks={false} />
    </RankedListPage>
  );
}
