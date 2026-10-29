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
import { httpUrl } from "@/lib/relays/nip11";
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
  const hasPublishedNames = relays.some((relay) => Boolean(relay.name?.trim()));
  const listDescription =
    relays.length === 0
      ? "Ranked by how many people list each relay."
      : total === relays.length
        ? `${total.toLocaleString()} relays people list. Bars match the most listed relay.`
        : `${total.toLocaleString()} relays people list. ${relays.length.toLocaleString()} shown. Bars match the most listed relay.`;

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
        title="Most listed"
        description={
          hasPublishedNames
            ? `${listDescription} Names are what each relay publishes about itself, separate from how many people list it.`
            : listDescription
        }
      >
        {relays.length > 0 ? (
          <ul className="divide-edge/70 divide-y">
            {relays.map((relay, index) => {
              const host = normalizeRelayHost(relay.normalized_url ?? "");
              const name = relay.name?.trim();
              const membership = indexMembershipNote(relay.admission_state, relay.in_registry);
              const detail = [name ? host : null, "people list this relay", membership]
                .filter(Boolean)
                .join(" · ");
              if (!host) {
                return (
                  <li key={relay.normalized_url} className="py-3">
                    <p className="text-ink text-sm">{name || relay.normalized_url}</p>
                    <p className="text-ink-muted text-sm">
                      {[name ? relay.normalized_url : null, "people list this relay", membership]
                        .filter(Boolean)
                        .join(" · ")}
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
                  label={name || undefined}
                  iconSrc={name ? (httpUrl(relay.icon) ?? undefined) : undefined}
                  bar={{
                    value: relay.distinct_users,
                    max: leaderUsers,
                    label: `${name || host} compared with the most listed relay`,
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
