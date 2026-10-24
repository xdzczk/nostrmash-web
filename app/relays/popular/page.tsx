import type { Metadata } from "next";

import { normalizeRelayHost } from "@/components/explorer/stats-utils";
import { EmptyState } from "@/components/explorer/empty-state";
import { PageHero } from "@/components/explorer/page-hero";
import { NetworkNav } from "@/components/explorer/network-nav";
import { RelayLink } from "@/components/relays/relay-link";
import { ShareBar } from "@/components/relays/share-bar";
import { StatusPill } from "@/components/relays/status-pill";
import { SectionCard } from "@/components/ui/section-card";
import { ErrorPanel } from "@/components/ui/status-panels";
import { getPopularRelays } from "@/lib/api/endpoints";
import { toUserFacingErrorMessage } from "@/lib/errors/user-message";

export const metadata: Metadata = {
  title: "Popular relays",
  description:
    "The most popular Nostr relays ranked by how many users include them in their relay lists.",
};

function admissionTone(state: string | undefined): "ok" | "bad" | "warn" | "neutral" {
  if (state === "active" || state === "pinned") return "ok";
  if (state === "blocked") return "bad";
  if (state === "probation" || state === "draining") return "warn";
  return "neutral";
}

export default async function PopularRelaysPage() {
  let errorMessage = "";
  let data: Awaited<ReturnType<typeof getPopularRelays>> | null = null;

  try {
    data = await getPopularRelays("shortTtl", { limit: 100 });
  } catch (error) {
    errorMessage = toUserFacingErrorMessage(error, "Failed to load popular relays.");
  }

  const relays = data?.relays ?? [];
  const total = typeof data?.total === "number" ? data.total : relays.length;
  const inRegistry = relays.filter((relay) => relay.in_registry).length;
  const leaderUsers = relays.reduce((max, relay) => Math.max(max, relay.distinct_users), 0);

  return (
    <div className="space-y-8">
      <PageHero
        eyebrow="Relay discovery"
        title="Popular relays"
        subtitle="Relays ranked by how many people include them in a public relay list. Someone who lists several relays is counted on each one."
      />
      <NetworkNav active="relays" />

      {errorMessage ? <ErrorPanel message={errorMessage} /> : null}

      <SectionCard
        title="Most popular relays"
        description={
          relays.length > 0
            ? total === relays.length
              ? `${total.toLocaleString()} relays, ${inRegistry.toLocaleString()} in the registry. Bars are scaled to the leader.`
              : `${total.toLocaleString()} relays in this ranking. ${relays.length.toLocaleString()} shown, ${inRegistry.toLocaleString()} of them in the registry. Bars are scaled to the leader.`
            : "Ranked by how many people list each relay."
        }
      >
        {relays.length > 0 ? (
          <ul className="divide-edge/70 divide-y">
            {relays.map((relay, index) => {
              const host = normalizeRelayHost(relay.normalized_url);
              return (
                <li key={relay.normalized_url} className="py-3">
                  <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                    {host ? (
                      <RelayLink host={host} rank={index + 1} />
                    ) : (
                      <p className="text-ink text-sm">{relay.normalized_url}</p>
                    )}
                    {relay.in_registry ? (
                      <StatusPill tone={admissionTone(relay.admission_state)}>
                        Admission {relay.admission_state ?? "tracked"}
                      </StatusPill>
                    ) : (
                      <StatusPill tone="neutral">Not in registry</StatusPill>
                    )}
                  </div>
                  <p className="text-ink-faint text-xs">
                    {relay.distinct_users.toLocaleString()} people list this relay
                  </p>
                  <ShareBar
                    value={relay.distinct_users}
                    max={leaderUsers}
                    label={`${host || relay.normalized_url} compared with the most listed relay`}
                  />
                </li>
              );
            })}
          </ul>
        ) : (
          <EmptyState
            title="No popular relay data"
            message="The API did not return any popular relay data. The relay registry may not be enabled yet."
          />
        )}
      </SectionCard>
    </div>
  );
}
