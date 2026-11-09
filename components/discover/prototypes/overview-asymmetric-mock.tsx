import Link from "@/components/app-link";

import { Sparkline } from "@/components/charts/sparkline";
import {
  ALSO_MOVING,
  CONVERSATIONS,
  EMERGING,
  FORMATS,
  FormatArt,
  GAINING,
  IndexList,
  LINKS,
  LIVE,
  Movement,
  PULSE,
  RISING,
  Rank,
  SectionHeader,
  TOPICS,
  ZAPS,
} from "@/components/discover/prototypes/overview-briefing-mock";
import { TabBar } from "@/components/ui/tabs";

/**
 * Second overview mock. Same fixtures as the even-column version.
 * Wide lead, narrow rail, and the heavy side alternates down the page.
 */

const PATH = "/design/overview-asymmetric";

const TABS = [
  { key: "overview", label: "Overview", href: PATH, active: true },
  { key: "notes", label: "Notes", href: "/trending/notes", active: false },
  { key: "media", label: "Media", href: "/trending/pictures", active: false },
  { key: "articles", label: "Articles", href: "/trending/long-form", active: false },
  { key: "people", label: "People", href: "/trending/profiles", active: false },
  { key: "topics", label: "Topics", href: "/trending/hashtags", active: false },
  { key: "links", label: "Links", href: "/trending/domains", active: false },
];

const RAIL_NOTES = ALSO_MOVING.slice(0, 4);
const RAIL_THREADS = CONVERSATIONS.slice(0, 4);
const WIDE_PEOPLE = GAINING.slice(0, 4);
const LEAD_FORMAT = FORMATS[0]!;
const SUPPORTING_FORMATS = FORMATS.slice(1);

const THUMB: Record<(typeof FORMATS)[number]["art"], string> = {
  picture: "relative h-16 w-16",
  video: "relative h-16 w-[7.1rem]",
  short: "relative h-16 w-11",
  article: "relative h-16 w-24",
};

const LEAD_NOTE =
  "Yes, the Lambo bros are louder. But there are currently more cyberpunks, more hacktivists and a lot more code, good code. Country-wide mesh networks, ecash, and zero-knowledge proofs are already deployed.";

function Why({ children }: { children: string }) {
  return (
    <p className="nm-evidence mt-1.5">
      <span className="text-ink-faint mr-2 font-semibold tracking-[0.1em] uppercase">Why now</span>
      <span className="text-ink-soft">{children}</span>
    </p>
  );
}

function LiveStrip() {
  return (
    <section
      aria-label="Happening now"
      className="border-edge/70 flex flex-wrap items-center gap-x-6 gap-y-2 border-y py-3"
    >
      <h2 className="nm-kicker flex items-center gap-2">
        <span className="nm-live-dot" aria-hidden />
        Live
      </h2>
      {LIVE.map((item) => (
        <p key={item.title} className="min-w-0 text-sm">
          <span className="text-ink font-medium">{item.title}</span>
          <span className="text-ink-muted">
            {" "}
            · {item.by} · {item.detail}
          </span>
        </p>
      ))}
      <Link href="/live" className="nm-action-link sm:ml-auto">
        All live
      </Link>
    </section>
  );
}

export function OverviewAsymmetricMock() {
  return (
    <div className="min-w-0 space-y-6 sm:space-y-7">
      <aside className="border-edge bg-surface-raised flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 rounded-md border px-4 py-3 text-sm">
        <p className="text-ink-muted leading-6">
          <span className="text-ink-soft font-medium">Asymmetric columns.</span> Same fixtures as
          the even version. The lead stays wide. Supporting rankings stay narrow.
        </p>
        <span className="flex shrink-0 gap-4">
          <Link href="/design/overview-briefing" className="nm-action-link">
            Even version
          </Link>
          <Link href="/" className="nm-action-link">
            Live overview
          </Link>
        </span>
      </aside>

      <section className="nm-signal-rule border-edge/80 space-y-3 border-b pt-1 pb-4 sm:space-y-3.5 sm:pt-2 sm:pb-5">
        <div className="space-y-2">
          <p className="nm-kicker">Today · All languages</p>
          <h1 className="nm-display-lg text-ink-strong">What has the network’s attention.</h1>
        </div>
        <div className="nm-meta flex flex-wrap items-center gap-x-3 gap-y-2">
          <div
            className="border-edge-strong bg-surface/40 inline-flex items-center rounded-full border p-0.5"
            role="group"
            aria-label="Ranking window"
          >
            <span
              aria-current="true"
              className="bg-surface text-ink inline-flex min-h-8 items-center rounded-full px-3 text-[11px] font-medium shadow-sm"
            >
              24h
            </span>
            <span className="text-ink-faint inline-flex min-h-8 items-center px-3 text-[11px] font-medium">
              7d
            </span>
            <span className="text-ink-faint inline-flex min-h-8 items-center px-3 text-[11px] font-medium">
              30d
            </span>
          </div>
          <span className="border-edge-strong bg-surface/40 text-ink-muted inline-flex min-h-9 items-center gap-2 rounded-full border px-3 text-[11px] font-medium">
            Language
            <span className="text-ink">All languages</span>
          </span>
          <span className="text-ink-muted inline-flex items-center gap-2">
            <span className="nm-live-dot" aria-hidden />
            Updated 7m ago
          </span>
          <span className="sr-only">Window and language controls are not wired on this mock.</span>
        </div>
        <p className="text-ink-muted text-sm leading-6">
          <span className="text-ink-soft tabular-nums">42.1K</span> notes
          <span aria-hidden> · </span>
          <span className="text-ink-soft tabular-nums">3.7K</span> authors
          <span aria-hidden> · </span>
          <span className="text-ink-soft tabular-nums">255.6K</span> sats zapped
          <span className="text-ink-faint"> · in line with a typical Monday</span>
        </p>
      </section>

      <div className="bg-surface sticky top-14 z-40 -mx-4 border-b border-[var(--edge)] px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <TabBar ariaLabel="Discover categories" items={TABS} />
      </div>

      <div className="space-y-14 sm:space-y-16">
        <section aria-labelledby="notes-heading">
          <div className="flex items-end justify-between gap-4">
            <h2 id="notes-heading" className="nm-kicker scroll-mt-32">
              The note to read first
            </h2>
            <Link href="/trending/notes" className="nm-action-link">
              All notes
            </Link>
          </div>
          <div className="mt-4 grid items-start gap-10 lg:grid-cols-[minmax(0,1.75fr)_minmax(16rem,0.8fr)] lg:gap-14">
            <article>
              <div className="flex items-center gap-3">
                <Rank value={1} />
                <span
                  aria-hidden
                  className="border-edge bg-surface-elevated text-ink-soft grid size-11 shrink-0 place-items-center rounded-full border text-xs font-semibold"
                >
                  J
                </span>
                <div className="min-w-0">
                  <p className="text-ink truncate font-medium">Juraj</p>
                  <p className="text-ink-faint text-xs">11 hours ago</p>
                </div>
                <div className="ml-auto">
                  <Movement move={2} />
                </div>
              </div>
              <p className="text-ink-strong font-display mt-5 line-clamp-5 max-w-[40rem] text-[clamp(1.7rem,1.05rem+1.7vw,2.55rem)] leading-[1.28] tracking-[-0.032em]">
                {LEAD_NOTE}
              </p>
              <Why>44 reactions in this window</Why>
              <p className="text-ink-muted mt-2 text-xs tabular-nums">
                15 replies · 15 reposts · 44 reactions · 8,683 sats
              </p>
              <p className="text-ink-muted mt-1 text-xs">Top zap · btcschellingpt · 420 sats</p>
              <Link href="/trending/notes" className="nm-action-link mt-3">
                Read the note
              </Link>
            </article>

            <div>
              <h3 className="nm-kicker">Also moving</h3>
              <ol className="border-edge/70 mt-3 divide-y divide-[var(--edge)] border-y">
                {RAIL_NOTES.map((note, index) => (
                  <li key={note.name} className="flex gap-3 py-2.5">
                    <Rank value={index + 2} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-3">
                        <p className="text-ink truncate text-sm font-medium">
                          {note.name}
                          <span className="text-ink-faint ml-2 font-normal">{note.ago}</span>
                        </p>
                        <Movement move={note.move} />
                      </div>
                      <p className="text-ink-soft mt-1 line-clamp-2 text-sm leading-5">
                        {note.line}
                      </p>
                      <Why>{note.why}</Why>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>

        <section aria-labelledby="formats-heading">
          <h2 id="formats-heading" className="nm-kicker scroll-mt-32">
            Leading each format
          </h2>
          <div className="mt-4 grid items-start gap-8 lg:grid-cols-[minmax(16rem,0.72fr)_minmax(0,1.45fr)] lg:items-stretch lg:gap-12">
            <div className="order-2 flex flex-col gap-5 lg:order-1 lg:h-full lg:justify-between lg:gap-4">
              {SUPPORTING_FORMATS.map((format) => (
                <article key={format.key} className="flex items-center gap-3">
                  <div className={`shrink-0 overflow-hidden rounded-sm ${THUMB[format.art]}`}>
                    <FormatArt
                      kind={format.art}
                      duration={format.duration}
                      frameClassName="absolute inset-0"
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-baseline justify-between gap-3">
                      <h3 className="nm-kicker">{format.label}</h3>
                      <Link href={format.href} className="nm-action-link">
                        Ranking
                      </Link>
                    </div>
                    <p className="text-ink mt-1 truncate text-sm font-medium">{format.title}</p>
                    <p className="nm-meta mt-0.5 truncate">
                      {format.by} · {format.metric}
                    </p>
                  </div>
                </article>
              ))}
            </div>
            <article className="order-1 lg:order-2">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h3 className="nm-kicker">{LEAD_FORMAT.label}</h3>
                <Link href={LEAD_FORMAT.href} className="nm-action-link">
                  Ranking
                </Link>
              </div>
              <FormatArt kind={LEAD_FORMAT.art} frameClassName="relative aspect-[2.4/1]" />
              <p className="text-ink-strong font-display mt-3 text-2xl tracking-[-0.03em]">
                {LEAD_FORMAT.title}
              </p>
              <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                <span className="text-ink-muted">
                  {LEAD_FORMAT.by} · {LEAD_FORMAT.ago} · {LEAD_FORMAT.metric}
                </span>
                <Movement move={LEAD_FORMAT.move} />
              </p>
            </article>
          </div>
        </section>

        <LiveStrip />

        <div className="grid items-start gap-12 lg:grid-cols-[minmax(0,1.5fr)_minmax(16rem,19rem)] lg:gap-14">
          <section aria-labelledby="conversations-heading">
            <SectionHeader
              kicker="Conversations"
              title="Threads still growing"
              headingId="conversations-heading"
              action={{ href: "/discovery/conversations/hot", label: "All conversations" }}
            />
            <ol className="border-edge/70 mt-5 divide-y divide-[var(--edge)] border-y">
              {RAIL_THREADS.map((thread, index) => (
                <li key={thread.title} className="flex items-baseline gap-3 py-3">
                  <Rank value={index + 1} />
                  <div className="min-w-0 flex-1">
                    <p className="text-ink truncate font-medium">{thread.title}</p>
                    <p className="nm-meta mt-0.5">{thread.detail}</p>
                  </div>
                  <Movement move={thread.move} />
                </li>
              ))}
            </ol>
          </section>
          <section aria-labelledby="zaps-heading">
            <SectionHeader
              kicker="Zaps"
              title="Where the sats went"
              headingId="zaps-heading"
              compact
              action={{ href: "/discovery/notes/zapped", label: "Zapped notes" }}
            />
            <ol className="border-edge/70 mt-5 divide-y divide-[var(--edge)] border-y">
              {ZAPS.map((zap) => (
                <li key={zap.kicker} className="py-3">
                  <h3 className="nm-kicker">{zap.kicker}</h3>
                  <p className="text-ink-strong font-display mt-2 text-2xl tracking-[-0.03em] tabular-nums">
                    {zap.amount}
                  </p>
                  <p className="text-ink mt-1 text-sm font-medium">{zap.title}</p>
                  <p className="mt-1 flex flex-wrap items-center gap-x-2">
                    <span className="nm-meta">{zap.detail}</span>
                    <Movement move={zap.move} />
                  </p>
                </li>
              ))}
            </ol>
          </section>
        </div>

        <div className="grid items-start gap-12 lg:grid-cols-[minmax(16rem,0.7fr)_minmax(0,1.45fr)] lg:gap-14">
          <section aria-labelledby="people-rising" className="order-2 lg:order-1">
            <SectionHeader
              kicker="People"
              title="Up and coming"
              headingId="people-rising"
              lede="Smaller accounts whose reach grew in this window."
              compact
              action={{ href: "/discovery/profiles/rising", label: "Full ranking" }}
            />
            <ol className="border-edge/70 mt-5 divide-y divide-[var(--edge)] border-y">
              {RISING.map((person, index) => (
                <li key={person.name} className="flex items-center gap-3 py-2.5">
                  <Rank value={index + 1} />
                  <div className="min-w-0 flex-1">
                    <p className="text-ink truncate text-sm font-medium">{person.name}</p>
                    <p className="nm-meta truncate">{person.handle}</p>
                  </div>
                  <Movement move={person.move} />
                </li>
              ))}
            </ol>
          </section>
          <section aria-labelledby="people-gaining" className="order-1 lg:order-2">
            <SectionHeader
              kicker="People"
              title="People gaining attention"
              headingId="people-gaining"
              lede="Ranked by reactions, replies, and zaps on each note."
              action={{ href: "/trending/profiles", label: "People index" }}
            />
            <ol className="border-edge/70 mt-5 divide-y divide-[var(--edge)] border-y">
              {WIDE_PEOPLE.map((person, index) => (
                <li key={person.name} className="flex items-start gap-3 py-3">
                  <Rank value={index + 1} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="text-ink truncate font-medium">{person.name}</p>
                      <Movement move={person.move} />
                    </div>
                    <p className="nm-meta mt-0.5 truncate">{person.handle}</p>
                    <Why>{person.why}</Why>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        </div>

        <div className="grid gap-14 lg:grid-cols-3 lg:gap-x-10">
          <section aria-labelledby="topics-heading">
            <SectionHeader
              kicker="Topics"
              title="Most used topics"
              headingId="topics-heading"
              lede="Hashtags by number of authors."
              action={{ href: "/trending/hashtags", label: "Topic index" }}
            />
            <IndexList rows={TOPICS} />
          </section>
          <section aria-labelledby="links-heading">
            <SectionHeader
              kicker="Links"
              title="Most shared links"
              headingId="links-heading"
              lede="Domains by number of authors."
              action={{ href: "/trending/domains", label: "Link index" }}
            />
            <IndexList rows={LINKS} />
          </section>
          <section aria-labelledby="emerging-heading">
            <SectionHeader
              kicker="Movers"
              title="Moving fastest"
              headingId="emerging-heading"
              lede="Largest jump since the previous check."
            />
            <IndexList rows={EMERGING} />
          </section>
        </div>

        <section aria-labelledby="pulse-heading" className="border-edge/70 border-t pt-8">
          <SectionHeader
            kicker="Network"
            title="Network pulse"
            headingId="pulse-heading"
            action={{ href: "/day/2026-11-08", label: "Compare with yesterday" }}
          />
          <div className="mt-2 grid sm:grid-cols-2 xl:grid-cols-4">
            {PULSE.map((stat, index) => (
              <article
                key={stat.label}
                className={`border-edge/70 py-5 ${index > 0 ? "border-t" : ""} ${
                  index >= 2 ? "sm:border-t" : "sm:border-t-0"
                } ${index % 2 === 1 ? "sm:border-l sm:pl-6" : ""} ${
                  index < 4 ? "xl:border-t-0" : ""
                } ${index % 4 === 0 ? "xl:border-l-0 xl:pl-0" : "xl:border-l xl:pl-6"}`}
              >
                <h3 className="text-ink-muted text-sm">{stat.label}</h3>
                <p className="text-ink-strong font-display mt-2 text-3xl tracking-[-0.03em] tabular-nums">
                  {stat.value}
                </p>
                <p className="text-ink-faint mt-1 text-xs">{stat.hint}</p>
                <Sparkline points={stat.points} className="text-ink-muted mt-3" />
              </article>
            ))}
          </div>
        </section>

        <div className="border-edge/70 border-t pt-4">
          <Link href="/methodology" className="nm-action-link">
            How this is ranked
          </Link>
        </div>
      </div>
    </div>
  );
}
