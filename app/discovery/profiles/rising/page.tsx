import Link from "next/link";
import type { Metadata } from "next";

import { ProfilesList } from "@/components/data/renderers";
import { RankedListPage } from "@/components/explorer/ranked-list-page";
import { getRisingProfiles } from "@/lib/api/endpoints";
import { hydrateProfiles } from "@/lib/api/profile-hydration";
import { loadRankedListPayload, readRankedListContext } from "@/lib/explorer/ranked-list";
import type { Profile } from "@/lib/types/api";

export const metadata: Metadata = {
  title: "Up and Coming Profiles",
  description:
    "Small accounts gaining followers fast or earning outsized engagement relative to their audience.",
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
      title="Up and coming"
      subtitle="Small accounts gaining followers fast, or earning engagement that's large relative to their own audience."
      path={path}
      searchParams={currentSearchParams}
      window={window}
      semantics={semantics}
      sectionTitle="Up-and-coming profile feed"
      sectionDescription="Small accounts gathering momentum before they break into the main trending ranking."
      errorMessage={errorMessage}
      emptyTitle="No up-and-coming profiles available"
      emptyMessage="The API did not return up-and-coming profiles for this window."
      hasItems={hydratedProfiles.length > 0}
      continuationHref={
        typeof nextCursor === "string" && nextCursor.length > 0
          ? buildCursorContinuation(nextCursor)
          : undefined
      }
      continuationLabel="Load more up-and-coming profiles"
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
