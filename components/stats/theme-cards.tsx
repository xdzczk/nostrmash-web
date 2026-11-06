import Link from "@/components/app-link";

import {
  getAccountStats,
  getGroupStats,
  getKindStats,
  getModerationStats,
  getZapStats,
} from "@/lib/api/endpoints";
import {
  activityHeadline,
  communitiesHeadline,
  moderationHeadline,
  peopleHeadline,
  relaysHeadline,
  zapsHeadline,
} from "@/lib/stats/headlines";
import { settle } from "@/lib/stats/settle";
import type { StatsWindow } from "@/lib/search-params/window";
import { statsHref } from "@/components/stats/stats-frame";

export async function StatsThemeCards({
  window,
  searchParams,
  relaysIndexed,
}: {
  window: StatsWindow;
  searchParams: URLSearchParams;
  relaysIndexed: number | null;
}) {
  const [kinds, zaps, accounts, moderation, groups] = await Promise.all([
    settle(getKindStats(window), "Kind stats are unavailable."),
    settle(getZapStats("shortTtl", window), "Zap stats are unavailable."),
    settle(getAccountStats("shortTtl"), "Account stats are unavailable."),
    settle(getModerationStats(), "Moderation stats are unavailable."),
    settle(getGroupStats(), "Group stats are unavailable."),
  ]);
  const cards = [
    { href: "/stats/activity", label: "Activity", text: activityHeadline(kinds.value, window) },
    { href: "/stats/zaps", label: "Zaps", text: zapsHeadline(zaps.value, window) },
    { href: "/stats/people", label: "People", text: peopleHeadline(accounts.value) },
    { href: "/stats/moderation", label: "Moderation", text: moderationHeadline(moderation.value) },
    { href: "/stats/relays", label: "Relays", text: relaysHeadline(relaysIndexed, window) },
    { href: "/stats/communities", label: "Communities", text: communitiesHeadline(groups.value) },
  ];
  return (
    <section aria-label="Statistics sections">
      <ul className="grid [grid-template-columns:repeat(auto-fit,minmax(16rem,1fr))] gap-3">
        {cards.map((card) => (
          <li key={card.href}>
            <Link
              href={statsHref(card.href, searchParams)}
              className="border-edge hover:border-edge-strong block h-full rounded-2xl border p-4"
            >
              <p className="text-ink-faint text-[11px] font-medium">{card.label}</p>
              <p className="text-ink mt-2 text-sm leading-6">{card.text}</p>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
