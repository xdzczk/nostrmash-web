import type { Metadata } from "next";

import { LiveRefresh } from "@/components/freshness/live-refresh";
import {
  AccountStatsSection,
  ClientStatsSection,
  IdentityStatsSection,
} from "@/components/stats/ecosystem-sections";
import { StatsFrame } from "@/components/stats/stats-frame";
import { LoadErrors } from "@/components/ui/status-panels";
import { getAccountStats, getClientStats, getIdentityStats } from "@/lib/api/endpoints";
import { peopleHeadline } from "@/lib/stats/headlines";
import { settle } from "@/lib/stats/settle";
import { toUrlSearchParams } from "@/lib/search-params/pagination";
import { formatStatsWindowSpan, readStatsWindow } from "@/lib/search-params/window";
import { buildEntityMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildEntityMetadata({
  title: "People stats",
  description: "Accounts, identity fields, and the clients people post from.",
  path: "/stats/people",
});

export default async function PeopleStatsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolved = await searchParams;
  const current = toUrlSearchParams(resolved);
  const window = readStatsWindow(resolved);
  const [accounts, identity, clients] = await Promise.all([
    settle(getAccountStats("shortTtl"), "Account stats are unavailable."),
    settle(getIdentityStats("shortTtl"), "Identity stats are unavailable."),
    settle(getClientStats("shortTtl", window), "Client stats are unavailable."),
  ]);
  const errors = [accounts, identity, clients].flatMap((result) =>
    result.error ? [result.error] : []
  );

  return (
    <>
      <LiveRefresh />
      <StatsFrame
        path="/stats/people"
        title="Who is on the index."
        subtitle={`Accounts and clients ${formatStatsWindowSpan(window)}.`}
        headline={peopleHeadline(accounts.value)}
        searchParams={current}
        window={window}
        toc={[
          { id: "accounts", label: "Accounts" },
          { id: "identity", label: "Identity" },
          { id: "clients", label: "Clients" },
        ]}
      >
        <LoadErrors errors={errors} />
        <AccountStatsSection data={accounts.value} />
        <IdentityStatsSection data={identity.value} />
        <ClientStatsSection data={clients.value} window={window} />
      </StatsFrame>
    </>
  );
}
