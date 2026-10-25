import Link from "next/link";
import type { Metadata } from "next";

import { PageHero } from "@/components/explorer/page-hero";
import { buildEntityMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildEntityMetadata({
  title: "Methodology",
  description:
    "What each NostrMash ranking is ordered by, and which number on the row is only context.",
  path: "/methodology",
});

const RANKINGS = [
  {
    href: "/trending/notes",
    title: "Notes",
    order: "A discovery score for short notes.",
    context:
      "The line under a note names the strongest reason in that score: replies gathering pace, reposts, reactions, or zaps, with the count behind it. That count explains the reason. It does not sort the list, so a note with more replies can rank lower.",
  },
  {
    href: "/trending/long-form",
    title: "Long-form",
    order: "The same discovery score as notes, for articles.",
    context: "The line under an article is the leading reason, read the same way as on a note.",
  },
  {
    href: "/discovery/conversations/hot",
    title: "Conversations",
    order: "How fast a thread is growing, and how recent that growth is.",
    context:
      "The reply total is the size of the thread. A longer thread can sit below a shorter one that is moving faster now.",
  },
  {
    href: "/trending/profiles",
    title: "People",
    order: "How much engagement each post earns.",
    context:
      "Accounts with no engagement in the window are left off. Publishing more, or having more followers, does not by itself raise the rank. The line is the leading reason for the score, usually engagement per post.",
  },
  {
    href: "/discovery/profiles/rising",
    title: "Up and coming",
    order: "Follower growth, or engagement that is large for a smaller audience.",
    context:
      "A larger audience has to move further to appear. Two new followers or fewer, and a single interaction, count as noise and do not hold a place.",
  },
  {
    href: "/trending/hashtags",
    title: "Topics",
    order: "How many distinct authors used the tag.",
    context:
      "The event count under the tag is a different figure. A tag with more events and fewer authors ranks lower.",
  },
  {
    href: "/trending/domains",
    title: "Links",
    order: "How many distinct authors shared the domain.",
    context:
      "The link count is how often it circulated. Many links from a few people rank below a domain shared more widely.",
  },
  {
    href: "/relays",
    title: "Relay activity",
    order: "How many events the index saw there.",
    context:
      "Bar length compares that relay with the leader. How many people were seen on it is separate.",
  },
  {
    href: "/relays/popular",
    title: "Popular relays",
    order: "How many people include it in a public relay list.",
    context: "Someone who lists several relays is counted once on each.",
  },
] as const;

export default function MethodologyPage() {
  return (
    <div className="space-y-12 sm:space-y-14">
      <PageHero
        eyebrow="Methodology"
        title="How rankings work."
        subtitle="Every list asks one question over the last 24 hours or the last 7 days. The sentence beside each name is the order. Any other number on the row is context, and a larger context number does not mean a higher rank."
      />

      <section aria-labelledby="ranking-orders">
        <h2 id="ranking-orders" className="nm-title text-ink">
          What decides the order
        </h2>
        <dl className="border-edge/70 mt-6 border-y">
          {RANKINGS.map((ranking) => (
            <div
              key={ranking.href}
              className="border-edge/70 grid gap-1 border-b py-4 last:border-b-0 sm:grid-cols-[12rem_minmax(0,1fr)] sm:items-baseline sm:gap-10 sm:py-5"
            >
              <dt>
                <Link
                  href={ranking.href}
                  className="text-ink hover:text-accent-ink inline-flex min-h-11 items-center text-base leading-7 font-medium sm:min-h-0"
                >
                  {ranking.title}
                </Link>
              </dt>
              <dd className="max-w-[40rem] space-y-1.5">
                <p className="text-ink text-[1.02rem] leading-7">{ranking.order}</p>
                <p className="text-ink-muted text-sm leading-6">{ranking.context}</p>
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <div className="max-w-[42rem] space-y-10">
        <section className="space-y-3">
          <h2 className="nm-title text-ink">The window</h2>
          <p className="text-ink-muted text-[1.02rem] leading-7">
            24h is the last day. 7d is the last week. Both keep rolling, so the same list read an
            hour later can have moved. Switching the window changes who qualifies. It does not
            change the question that list is asking.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="nm-title text-ink">The line under a row</h2>
          <p className="text-ink-muted text-[1.02rem] leading-7">
            “Why now” is the leading reason, in ordinary language. On topics and links the large
            number is the order, and the line is the other figure. On notes, conversations, and
            people the line explains the score. It is not a second ranking.
          </p>
          <p className="text-ink-muted text-[1.02rem] leading-7">
            A rank that has moved since the previous computation can show how many places. A rank
            that held still, or has no earlier place to compare, stays unmarked.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="nm-title text-ink">Freshness</h2>
          <p className="text-ink-muted text-[1.02rem] leading-7">
            Discovery rankings are recomputed about once a minute. When a page says it was updated,
            that is when this ranking was computed. If the index is late, the last useful result
            stays on screen and the page says so. Old data is never called live.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="nm-title text-ink">What the index covers</h2>
          <p className="text-ink-muted text-[1.02rem] leading-7">
            These lists describe the NostrMash index, not every public relay. What appears depends
            on which relays have been ingested and how long events are kept. A missing note can be
            outside this index. Each page shows a bounded slice of a ranking, and continuing the
            list keeps the same order.
          </p>
        </section>

        <section id="trust" className="scroll-mt-28 space-y-3">
          <h2 className="nm-title text-ink">Trust</h2>
          <p className="text-ink-muted text-[1.02rem] leading-7">
            The Trust mark on a profile is distance, through follows, from a small set of seed
            accounts. It is not a judgment of the person or their posts.
          </p>
          <p className="text-ink-muted text-[1.02rem] leading-7">
            Seed accounts anchor the graph. Hop 1 is one follow away from a seed, Hop 2 is two, and
            so on. A percentile, such as top 0.1%, is that account’s place among indexed profiles.
            Accounts the graph cannot reach have no Trust mark, rather than a low one.
          </p>
          <p className="text-ink-muted text-[1.02rem] leading-7">
            Some rankings can weigh engagement by this distance. When a list does, its About this
            data panel says trust was applied.
          </p>
        </section>
      </div>
    </div>
  );
}
