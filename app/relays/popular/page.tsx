import Link from "next/link";
import type { Metadata } from "next";

import { normalizeRelayHost } from "@/components/explorer/stats-utils";
import { EmptyState } from "@/components/explorer/empty-state";
import { PageHero } from "@/components/explorer/page-hero";
import { StatCard } from "@/components/explorer/stat-card";
import { SectionCard } from "@/components/ui/section-card";
import { ErrorPanel } from "@/components/ui/status-panels";
import { getPopularRelays } from "@/lib/api/endpoints";

export const metadata: Metadata = {
  title: "Popular relays",
  description:
    "The most popular Nostr relays ranked by how many users include them in their relay lists.",
};

function admissionBadge(state: string | undefined) {
  if (!state) return null;
  const colors: Record<string, string> = {
    active: "border-emerald-700/60 text-emerald-300",
    pinned: "border-sky-700/60 text-sky-300",
    probation: "border-amber-700/60 text-amber-300",
    candidate: "border-zinc-700 text-zinc-400",
    inactive: "border-zinc-700 text-zinc-500",
    blocked: "border-red-800/60 text-red-400",
    draining: "border-orange-700/60 text-orange-300",
  };
  return (
    <span
      className={`rounded-full border px-2 py-0.5 text-[11px] ${colors[state] ?? "border-zinc-700 text-zinc-400"}`}
    >
      {state}
    </span>
  );
}

export default async function PopularRelaysPage() {
  let errorMessage = "";
  let data: Awaited<ReturnType<typeof getPopularRelays>> | null = null;

  try {
    data = await getPopularRelays("shortTtl", { limit: 100 });
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : "Failed to load popular relays.";
  }

  const relays = data?.relays ?? [];
  const inRegistry = relays.filter((r) => r.in_registry).length;
  const totalUsers = relays.reduce((sum, r) => sum + r.distinct_users, 0);

  return (
    <div className="space-y-8">
      <PageHero
        eyebrow="Relay discovery"
        title="Popular relays"
        subtitle="Relays ranked by the number of Nostr users who include them in their relay lists (kind 10002)."
        badges={
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-full border border-zinc-700 px-2 py-1 text-zinc-300">
              relays shown: {relays.length.toLocaleString()}
            </span>
            <span className="rounded-full border border-zinc-700 px-2 py-1 text-zinc-300">
              tracked by registry: {inRegistry.toLocaleString()}
            </span>
            <Link
              href="/relays"
              className="rounded-full border border-zinc-700 px-2 py-1 text-indigo-300 hover:border-indigo-400/40"
            >
              Back to relay explorer
            </Link>
          </div>
        }
      />

      {errorMessage ? <ErrorPanel message={errorMessage} /> : null}

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="relays ranked" value={relays.length} />
        <StatCard label="in registry" value={inRegistry} />
        <StatCard
          label="top relay users"
          value={relays[0]?.distinct_users ?? 0}
          description={relays[0]?.normalized_url}
        />
        <StatCard label="total user refs" value={totalUsers} />
      </section>

      <SectionCard
        title="Most popular relays"
        description="Ranked by how many distinct users list this relay in their kind-10002 relay list."
      >
        {relays.length > 0 ? (
          <ul className="space-y-2">
            {relays.map((relay, index) => {
              const host = normalizeRelayHost(relay.normalized_url);
              return (
                <li
                  key={relay.normalized_url}
                  className="rounded-md border border-zinc-800 bg-zinc-900/40 p-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm text-zinc-100">
                        <span className="mr-2 text-zinc-500">#{index + 1}</span>
                        {relay.normalized_url}
                      </p>
                      <p className="mt-1 text-xs text-zinc-500">
                        {relay.distinct_users.toLocaleString()} users
                        {relay.in_registry && relay.admission_state
                          ? ` · ${relay.admission_state}`
                          : ""}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      {relay.in_registry ? (
                        admissionBadge(relay.admission_state)
                      ) : (
                        <span className="rounded-full border border-zinc-700/50 px-2 py-0.5 text-[11px] text-zinc-600">
                          not tracked
                        </span>
                      )}
                      {host ? (
                        <Link
                          href={`/relays/${encodeURIComponent(host)}`}
                          className="rounded-full border border-zinc-700 px-3 py-1 text-indigo-300 hover:border-indigo-400/40"
                        >
                          Open relay
                        </Link>
                      ) : null}
                    </div>
                  </div>
                  <div className="mt-2">
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
                      <div
                        className="h-full rounded-full bg-indigo-500/60"
                        style={{
                          width: `${totalUsers > 0 ? Math.max((relay.distinct_users / totalUsers) * 100, 0.5) : 0}%`,
                        }}
                      />
                    </div>
                  </div>
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
