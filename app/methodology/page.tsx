import Link from "@/components/app-link";
import type { Metadata } from "next";

import { PageHero } from "@/components/explorer/page-hero";
import { Term } from "@/components/ui/term";
import { buildEntityMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildEntityMetadata({
  title: "Methodology",
  description:
    "What each NostrMash ranking is ordered by, and which number on the row is only context.",
  path: "/methodology",
});

const RANKINGS = [
  {
    id: "notes",
    href: "/trending/notes",
    title: "Notes",
    order: "A discovery score for short notes.",
    context:
      "The line under a note names the strongest reason in that score: replies gathering pace, reposts, reactions, or zaps, with the count behind it. That count explains the reason. It does not sort the list, so a note with more replies can rank lower.",
  },
  {
    id: "articles",
    href: "/trending/long-form",
    title: "Articles",
    order: "The same discovery score as notes, for articles.",
    context: "The line under an article is the leading reason, read the same way as on a note.",
  },
  {
    id: "pictures",
    href: "/trending/pictures",
    title: "Pictures",
    order: "The same discovery score as notes, for kind 20 pictures.",
    context:
      "Pictures, videos, and shorts each have their own list. A busy short does not take a picture's place.",
  },
  {
    id: "videos",
    href: "/trending/videos",
    title: "Videos",
    order: "The same discovery score as notes, for long video (kinds 21 and 34235).",
    context:
      "The addressable form is ranked with regular video. The line under the card is the leading reason.",
  },
  {
    id: "shorts",
    href: "/trending/shorts",
    title: "Shorts",
    order: "The same discovery score as notes, for short video (kinds 22 and 34236).",
    context:
      "A short is ranked with other shorts. It does not compete with pictures or long video.",
  },
  {
    id: "live",
    href: "/live",
    title: "Live",
    order: "How many people are watching now, then replies, reposts, reactions, and zaps.",
    context:
      "The list is what is on the air at the moment you open it. A stream whose start is still ahead, or whose end has passed, stays off. 24h, 7d, and 30d belong to the other rankings.",
  },
  {
    id: "conversations",
    href: "/discovery/conversations/hot",
    title: "Conversations",
    order: "How fast a thread is growing, and how recent that growth is.",
    context:
      "The reply total is the size of the thread. A longer thread can sit below a shorter one that is moving faster now.",
  },
  {
    id: "most-zapped",
    href: "/discovery/notes/zapped",
    title: "Most zapped",
    order: "Sats a root note or article received in the window.",
    context:
      "One large zap is enough to rank. A zap the author sent to their own note does not count. The zap figure on the row is that window. Replies, reposts, and reactions are lifetime. The list is rewritten about every 5 minutes.",
  },
  {
    id: "most-bookmarked",
    href: "/discovery/notes/bookmarked",
    title: "Most bookmarked",
    order: "How many people currently have it saved.",
    context:
      "One person counts once, even if they saved it in several lists. The author does not count, and private bookmarks do not count. There is no time window. An article shows up once it has been ingested.",
  },
  {
    id: "people",
    href: "/trending/profiles",
    title: "People",
    order: "How much engagement each post earns.",
    context:
      "Accounts with no engagement in the window are left off. Publishing more, or having more followers, does not by itself raise the rank. The line is the leading reason for the score, usually engagement per post.",
  },
  {
    id: "rising",
    href: "/discovery/profiles/rising",
    title: "Up and coming",
    order: "Follower growth, or engagement that is large for a smaller audience.",
    context:
      "A larger audience has to move further to appear. Two new followers or fewer, and a single interaction, count as noise and do not hold a place.",
  },
  {
    id: "most-supported",
    href: "/discovery/profiles/supported",
    title: "Most supported",
    order: "Sats received in the window, with each sender capped at 100,000 sats.",
    context:
      "Three people sending 50,000 outrank one person sending 500,000, because that sender stops counting at 100,000. The line under the name is the capped amount. A self-zap does not count. The list is rewritten with most zapped notes.",
  },
  {
    id: "most-followed",
    href: "/discovery/profiles/followed",
    title: "Most followed",
    order: "How many people follow the account.",
    context:
      "The account needs a profile. Dormant accounts stay in the list, and so do accounts with fewer than 1,000 followers. Language does not change the order.",
  },
  {
    id: "topics",
    href: "/trending/hashtags",
    title: "Topics",
    order: "How many distinct authors used the tag.",
    context:
      "The event count under the tag is a different figure. A tag with more events and fewer authors ranks lower.",
  },
  {
    id: "links",
    href: "/trending/domains",
    title: "Links",
    order: "How many distinct authors shared the domain.",
    context:
      "The link count is how often it circulated. Many links from a few people rank below a domain shared more widely.",
  },
  {
    id: "relays",
    href: "/relays",
    title: "Relay activity",
    order: "How many events the index saw there.",
    context:
      "Bar length compares that relay with the leader. How many people were seen on it is separate.",
  },
  {
    id: "popular",
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
        subtitle="Each list asks one question. Most use the last 24 hours, the last 7 days, or the last 30 days. The sentence beside each name is the order. Any other number on the row is context, and a larger context number does not mean a higher rank."
      />

      <section aria-labelledby="ranking-orders">
        <h2 id="ranking-orders" className="nm-title text-ink">
          What decides the order
        </h2>
        <dl className="border-edge/70 mt-6 border-y">
          {RANKINGS.map((ranking) => (
            <div
              key={ranking.href}
              id={ranking.id}
              className="border-edge/70 grid scroll-mt-28 gap-1 border-b py-4 last:border-b-0 sm:grid-cols-[12rem_minmax(0,1fr)] sm:items-baseline sm:gap-10 sm:py-5"
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
            24h is the last day. 7d is the last week. 30d is the last 30 days. All three keep
            rolling, so the same list read an hour later can have moved. Switching the window
            changes who qualifies. It does not change the question that list is asking. Live uses
            the present: the streams on the air when you open the page. Most bookmarked notes and
            most followed accounts have no window. Bookmarks are who has a note saved now, and
            followers are the directory. Most zapped notes open on 7 days. Most supported accounts
            open on 30 days.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="nm-title text-ink">The line under a row</h2>
          <p className="text-ink-muted text-[1.02rem] leading-7">
            “Why now” is one sentence naming the strongest reason this row is here. On topics and
            links the large number is how many authors shared it, and that number is the order. On
            notes, conversations, and people the sentence explains the score. It is not a second
            ranking.
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
            stays on screen and the page says so. Old data is never called live. Most zapped notes
            and most supported accounts wait for a worker, which writes them once at startup and
            then about every 5 minutes. Until that happens the list is empty. Most bookmarked notes
            stay current with ingest.
          </p>
        </section>

        <section id="coverage" className="scroll-mt-28 space-y-3">
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
            The Trust mark on a profile is distance, through follows, from a small set of{" "}
            <Term id="seed">seed</Term> accounts. It is not a judgment of the person or their posts.
          </p>
          <p className="text-ink-muted text-[1.02rem] leading-7">
            <Term id="seed">Seed</Term> accounts anchor the graph. <Term id="hop">Hop</Term> 1 is
            one follow away from a seed, Hop 2 is two, and so on. A percentile, such as top 0.1%, is
            that account’s place among indexed profiles. Accounts the graph cannot reach have no
            Trust mark, rather than a low one.
          </p>
          <p className="text-ink-muted text-[1.02rem] leading-7">
            Some rankings can weigh engagement by this distance. When a list does, its About this
            data panel says trust was applied.
          </p>
        </section>

        <section id="identifiers" className="scroll-mt-28 space-y-3">
          <h2 className="nm-title text-ink">Identifiers</h2>
          <p className="text-ink-muted text-[1.02rem] leading-7">
            A <Term id="nevent">nevent</Term> is a shareable Nostr identifier for a note. It can
            carry the author and kind so a client can find the event. Copying it does not change the
            note.
          </p>
        </section>
      </div>
    </div>
  );
}
