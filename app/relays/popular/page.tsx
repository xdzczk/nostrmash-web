import type { Metadata } from "next";

import { normalizeRelayHost } from "@/components/explorer/stats-utils";
import { EmptyState } from "@/components/explorer/empty-state";
import { PageHero } from "@/components/explorer/page-hero";
import { NetworkNav } from "@/components/explorer/network-nav";
import { RelayRankRow } from "@/components/relays/relay-rank-row";
import { SectionCard } from "@/components/ui/section-card";
import { ErrorPanel } from "@/components/ui/status-panels";
import { getPopularRelays } from "@/lib/api/endpoints";
import { indexMembershipNote } from "@/lib/relays/index-membership";
import { publishedRelayMark, relayRankingDetail, withPublishedNames } from "@/lib/relays/nip11";
import { toUserFacingErrorMessage } from "@/lib/errors/user-message";

export const metadata: Metadata = {
  title: "Popular relays",
  description:
    "The most popular Nostr relays ranked by how many users include them in their relay lists.",
};

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
  const leaderUsers = relays.reduce((max, relay) => Math.max(max, relay.distinct_users), 0);
  const hasPublishedNames = relays.some((relay) => publishedRelayMark(relay));
  const listDescription = withPublishedNames(
    relays.length === 0
      ? "Ranked by how many people list each relay."
      : total === relays.length
        ? `${total.toLocaleString()} relays people list. Bars match the most listed relay.`
        : `${total.toLocaleString()} relays people list. ${relays.length.toLocaleString()} shown. Bars match the most listed relay.`,
    hasPublishedNames,
    "listed"
  );

  return (
    <div className="space-y-8">
      <PageHero
        eyebrow="Relay discovery"
        title="Popular relays"
        subtitle="Relays ranked by how many people include them in a public relay list. Someone who lists several relays is counted on each one."
      />
      <NetworkNav active="relays" />

      {errorMessage ? <ErrorPanel message={errorMessage} /> : null}

      <SectionCard title="Most listed" description={listDescription}>
        {relays.length > 0 ? (
          <ul className="divide-edge/70 divide-y">
            {relays.map((relay, index) => {
              const host = normalizeRelayHost(relay.normalized_url ?? "");
              const published = publishedRelayMark(relay);
              const membership = indexMembershipNote(relay.admission_state, relay.in_registry);
              const detail = relayRankingDetail(host, published?.name, [
                "people list this relay",
                membership,
              ]);
              if (!host) {
                return (
                  <li key={relay.normalized_url} className="py-3">
                    <p className="text-ink text-sm">{published?.name || relay.normalized_url}</p>
                    <p className="text-ink-muted text-sm">
                      {relayRankingDetail(relay.normalized_url, published?.name, [
                        "people list this relay",
                        membership,
                      ])}
                    </p>
                  </li>
                );
              }
              return (
                <RelayRankRow
                  key={relay.normalized_url}
                  host={host}
                  rank={index + 1}
                  value={relay.distinct_users.toLocaleString()}
                  detail={detail}
                  label={published?.name}
                  iconSrc={published?.iconSrc}
                  bar={{
                    value: relay.distinct_users,
                    max: leaderUsers,
                    label: `${published?.name || host} compared with the most listed relay`,
                  }}
                />
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
