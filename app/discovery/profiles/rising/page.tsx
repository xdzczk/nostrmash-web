import Link from "next/link";
import type { Metadata } from "next";

import { ProfilesList } from "@/components/data/renderers";
import { DebugDisclosure } from "@/components/explorer/debug-disclosure";
import { EmptyState } from "@/components/explorer/empty-state";
import { NativeSemanticsBadges } from "@/components/explorer/native-semantics-badges";
import { PageHero } from "@/components/explorer/page-hero";
import { SectionCard } from "@/components/ui/section-card";
import { ErrorPanel } from "@/components/ui/status-panels";
import { getRisingProfiles } from "@/lib/api/endpoints";
import { extractNativeApiSemantics } from "@/lib/api/normalize";
import { hydrateProfiles } from "@/lib/api/profile-hydration";
import {
  buildContinuationHref,
  readSearchParam,
  toUrlSearchParams,
} from "@/lib/search-params/pagination";
import type { Profile } from "@/lib/types/api";

export const metadata: Metadata = {
  title: "Rising Profiles",
  description:
    "Profiles gaining momentum in current discovery windows before they reach top-ranked lists.",
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function RisingProfilesPage({ searchParams }: { searchParams: SearchParams }) {
  const resolvedSearchParams = await searchParams;
  const cursor = readSearchParam(resolvedSearchParams, "cursor");
  const currentSearchParams = toUrlSearchParams(resolvedSearchParams);
  let errorMessage = "";
  let payload: Awaited<ReturnType<typeof getRisingProfiles>> | null = null;
  let hydratedProfiles: Profile[] = [];

  try {
    payload = await getRisingProfiles("shortTtl", { cursor });
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : "Failed to load rising profiles.";
  }
  const continuationHref = buildContinuationHref(
    "/discovery/profiles/rising",
    currentSearchParams,
    "cursor",
    payload?.next_cursor
  );

  const sourceProfiles = payload?.profiles ?? [];
  const semantics = extractNativeApiSemantics(payload);
  const hasSemantics =
    semantics.consistency !== undefined ||
    semantics.trust_mode !== undefined ||
    semantics.trust_applied !== undefined ||
    semantics.result_scope !== undefined;
  if (sourceProfiles.length > 0) {
    try {
      hydratedProfiles = await hydrateProfiles(sourceProfiles, "shortTtl");
    } catch {
      hydratedProfiles = sourceProfiles;
    }
  }

  return (
    <div className="space-y-8">
      <PageHero
        eyebrow="Discovery depth"
        title="Rising profiles"
        subtitle="Profiles with accelerating discovery signals, useful for finding emerging participants before top-rank saturation."
        badges={
          hasSemantics ? (
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <NativeSemanticsBadges semantics={semantics} />
            </div>
          ) : undefined
        }
      />

      <SectionCard
        title="Rising profile feed"
        description="Momentum-oriented profile discovery that complements static trending lists."
      >
        {errorMessage ? (
          <ErrorPanel message={errorMessage} />
        ) : hydratedProfiles.length > 0 ? (
          <ProfilesList profiles={hydratedProfiles} ranked />
        ) : (
          <EmptyState
            title="No rising profiles available"
            message="The API did not return rising profile entries for this discovery window."
          />
        )}
        {typeof payload?.next_cursor === "string" && payload.next_cursor.length > 0 ? (
          <Link href={continuationHref} className="mt-3 inline-block text-sm text-indigo-300">
            Load more rising profiles
          </Link>
        ) : null}
      </SectionCard>

      <SectionCard
        title="Next exploration paths"
        description="Bridge from profile momentum into live note and conversation context."
      >
        <div className="flex flex-wrap gap-2 text-xs">
          <Link
            href="/discovery/conversations/hot"
            className="rounded-full border border-zinc-700 px-2.5 py-1 text-zinc-300 hover:text-zinc-100"
          >
            Open hot conversations
          </Link>
          <Link
            href="/trending/profiles"
            className="rounded-full border border-zinc-700 px-2.5 py-1 text-zinc-300 hover:text-zinc-100"
          >
            Compare against trending profiles
          </Link>
        </div>
      </SectionCard>

      <DebugDisclosure title="Debug payload" data={payload ?? {}} />
    </div>
  );
}
