import Link from "next/link";
import type { Metadata } from "next";

import { ProfilesList } from "@/components/data/renderers";
import { RankedListPage } from "@/components/explorer/ranked-list-page";
import { getRisingProfiles } from "@/lib/api/endpoints";
import { hydrateProfiles } from "@/lib/api/profile-hydration";
import { loadRankedListPayload, readRankedListContext } from "@/lib/explorer/ranked-list";
import type { Profile } from "@/lib/types/api";

export const metadata: Metadata = {
  title: "Rising Profiles",
  description: "Profiles gaining ground before they reach the main trending lists.",
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function RisingProfilesPage({ searchParams }: { searchParams: SearchParams }) {
  const path = "/discovery/profiles/rising";
  const { cursor, window, currentSearchParams, buildCursorContinuation } = readRankedListContext(
    await searchParams,
    path
  );
  const { payload, errorMessage, semantics } = await loadRankedListPayload(
    () => getRisingProfiles("shortTtl", { cursor, window }),
    "Failed to load rising profiles."
  );
  const sourceProfiles = payload?.profiles ?? [];
  const nextCursor = payload?.next_cursor;

  let hydratedProfiles: Profile[] = [];
  if (sourceProfiles.length > 0) {
    try {
      hydratedProfiles = await hydrateProfiles(sourceProfiles, "shortTtl");
    } catch {
      hydratedProfiles = sourceProfiles;
    }
  }

  return (
    <RankedListPage
      discoverView="people"
      discoverMode="rising"
      eyebrow="Discovery depth"
      title="Rising profiles"
      subtitle="Profiles gaining traction before they reach the main trending lists."
      path={path}
      searchParams={currentSearchParams}
      window={window}
      semantics={semantics}
      sectionTitle="Rising profile feed"
      sectionDescription="Profiles gathering momentum before they break into the main ranking."
      errorMessage={errorMessage}
      emptyTitle="No rising profiles available"
      emptyMessage="The API did not return rising profiles for this window."
      hasItems={hydratedProfiles.length > 0}
      continuationHref={
        typeof nextCursor === "string" && nextCursor.length > 0
          ? buildCursorContinuation(nextCursor)
          : undefined
      }
      continuationLabel="Load more rising profiles"
      footer={
        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          <Link
            href="/discovery/conversations/hot"
            className="border-edge-strong text-ink-dim hover:text-ink rounded-full border px-2.5 py-1"
          >
            Open hot conversations
          </Link>
          <Link
            href="/trending/profiles"
            className="border-edge-strong text-ink-dim hover:text-ink rounded-full border px-2.5 py-1"
          >
            See trending profiles
          </Link>
        </div>
      }
      debugPayload={payload ?? {}}
    >
      <ProfilesList profiles={hydratedProfiles} ranked />
    </RankedListPage>
  );
}
