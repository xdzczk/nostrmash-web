import Link from "@/components/app-link";

import { Sparkline, type SeriesPoint } from "@/components/charts/sparkline";
import { TabBar } from "@/components/ui/tabs";

/**
 * Static layout proposal for the Discover overview.
 * Every figure on this page is a fixture for review. Nothing here is live.
 */

const PATH = "/design/overview-briefing";

type Move = number | "new";

const TABS = [
  { key: "overview", label: "Overview", href: PATH, active: true },
  { key: "notes", label: "Notes", href: "/trending/notes", active: false },
  { key: "media", label: "Media", href: "/trending/pictures", active: false },
  { key: "articles", label: "Articles", href: "/trending/long-form", active: false },
  { key: "people", label: "People", href: "/trending/profiles", active: false },
  { key: "topics", label: "Topics", href: "/trending/hashtags", active: false },
  { key: "links", label: "Links", href: "/trending/domains", active: false },
];

const ALSO_MOVING = [
  {
    name: "Noshole",
    ago: "2 hours ago",
    line: "Back in the day we just posted the thing.",
    why: "52 replies are still arriving",
    move: 1 as Move,
  },
  {
    name: "paul keating",
    ago: "4 hours ago",
    line: "The client shipped before the spec did.",
    why: "Posted recently and already in this ranking",
    move: "new" as Move,
  },
  {
    name: "Gzuuus",
    ago: "10 hours ago",
    line: "Jensen also likes Chinese models. I can sympathize with him.",
    why: "11 replies are still arriving",
    move: 2 as Move,
  },
  {
    name: "Gigi",
    ago: "6 hours ago",
    line: "A relay is a cache with opinions.",
    why: "Each reply draws about 4 more",
    move: 3 as Move,
  },
  {
    name: "21 Futures",
    ago: "8 hours ago",
    line: "The interesting part is who shows up after the zap.",
    why: "19 zaps from 12 people",
    move: 1 as Move,
  },
];

const FORMATS = [
  {
    key: "pictures",
    label: "Pictures",
    href: "/trending/pictures",
    title: "Cookie Sleeping",
    by: "highperfocused",
    ago: "11 hours ago",
    metric: "128 reactions",
    move: 2 as Move,
    art: "picture" as const,
  },
  {
    key: "videos",
    label: "Videos",
    href: "/trending/videos",
    title: "Nostr stop-motion",
    by: "archjourney",
    ago: "5 hours ago",
    metric: "86 reactions",
    move: 1 as Move,
    art: "video" as const,
    duration: "0:42",
  },
  {
    key: "shorts",
    label: "Shorts",
    href: "/trending/shorts",
    title: "Random Beat",
    by: "Beatbox Serenade",
    ago: "3 hours ago",
    metric: "64 reactions",
    move: "new" as Move,
    art: "short" as const,
    duration: "0:18",
  },
  {
    key: "articles",
    label: "Articles",
    href: "/trending/long-form",
    title: "Country-wide mesh networks",
    by: "Juraj",
    ago: "9 hours ago",
    metric: "41 reactions",
    move: 4 as Move,
    art: "article" as const,
  },
];

const CONVERSATIONS = [
  {
    title: "Yes, the Lambo bros are louder.",
    detail: "52 replies · 18 people · still arriving",
    move: 3 as Move,
  },
  {
    title: "Mesh networks, country by country",
    detail: "27 replies · 11 people · still arriving",
    move: "new" as Move,
  },
  {
    title: "Jensen also likes Chinese models.",
    detail: "19 replies · 9 people",
    move: 1 as Move,
  },
  {
    title: "What a relay is actually for",
    detail: "14 replies · 7 people",
    move: 2 as Move,
  },
  {
    title: "The client shipped before the spec",
    detail: "11 replies · 6 people",
    move: 4 as Move,
  },
];

const GAINING = [
  {
    name: "Juraj",
    handle: "juraj@tamersofentropy.net",
    why: "Each note gets about 35 reactions, replies, and zaps",
    move: 1 as Move,
  },
  {
    name: "Gzuuus",
    handle: "gzuuus@contextvm.org",
    why: "Each note gets about 30 reactions, replies, and zaps",
    move: 2 as Move,
  },
  {
    name: "Noshole",
    handle: "noshole@turdsoup.com",
    why: "52 replies landed on one note",
    move: "new" as Move,
  },
  {
    name: "Gigi",
    handle: "dergigi.com",
    why: "Each note gets about 19 reactions, replies, and zaps",
    move: 1 as Move,
  },
  {
    name: "paul keating",
    handle: "paulkeating@nostr.com",
    why: "Entered the ranking within the last few hours",
    move: 5 as Move,
  },
];

const RISING = [
  {
    name: "21 Futures",
    handle: "21Futures@NostrAddress.com",
    why: "Gained 19 followers",
    move: 3 as Move,
  },
  {
    name: "noobslayer69",
    handle: "user27992686@fountain.fm",
    why: "Reach grew faster than follower count",
    move: "new" as Move,
  },
  {
    name: "resin man",
    handle: "layer1.studio",
    why: "About 1.4 interactions for each follower",
    move: 2 as Move,
  },
  {
    name: "Farhad A.",
    handle: "faab64@momostr.pink",
    why: "About 1.2 interactions for each follower",
    move: 1 as Move,
  },
  {
    name: "Beatbox Serenade",
    handle: "beatbox@nostr.com",
    why: "A short video carried the account into the list",
    move: 6 as Move,
  },
];

const TOPICS = [
  { label: "#bitcoin", href: "/hashtags/bitcoin", value: "148", noun: "authors", move: 1 as Move },
  { label: "#nostr", href: "/hashtags/nostr", value: "90", noun: "authors", move: 0 as Move },
  { label: "#news", href: "/hashtags/news", value: "63", noun: "authors", move: 2 as Move },
  { label: "#ai", href: "/hashtags/ai", value: "54", noun: "authors", move: 1 as Move },
  {
    label: "#photography",
    href: "/hashtags/photography",
    value: "42",
    noun: "authors",
    move: -1 as Move,
  },
  { label: "#music", href: "/hashtags/music", value: "36", noun: "authors", move: 3 as Move },
];

const LINKS = [
  {
    label: "youtube.com",
    href: "/domains/youtube.com",
    value: "209",
    noun: "authors",
    move: 0 as Move,
  },
  { label: "x.com", href: "/domains/x.com", value: "86", noun: "authors", move: 1 as Move },
  {
    label: "github.com",
    href: "/domains/github.com",
    value: "65",
    noun: "authors",
    move: -1 as Move,
  },
  {
    label: "otherstuff.ai",
    href: "/domains/otherstuff.ai",
    value: "30",
    noun: "authors",
    move: 8 as Move,
  },
  {
    label: "theguardian.com",
    href: "/domains/theguardian.com",
    value: "24",
    noun: "authors",
    move: "new" as Move,
  },
  {
    label: "instagram.com",
    href: "/domains/instagram.com",
    value: "17",
    noun: "authors",
    move: 2 as Move,
  },
];

const EMERGING = [
  { label: "#catstr", href: "/hashtags/catstr", value: "28", noun: "authors", move: "new" as Move },
  {
    label: "#meshcore",
    href: "/hashtags/meshcore",
    value: "19",
    noun: "authors",
    move: 22 as Move,
  },
  {
    label: "otherstuff.ai",
    href: "/domains/otherstuff.ai",
    value: "30",
    noun: "authors",
    move: 14 as Move,
  },
  { label: "#ecash", href: "/hashtags/ecash", value: "16", noun: "authors", move: 11 as Move },
  {
    label: "#grapheneos",
    href: "/hashtags/grapheneos",
    value: "9",
    noun: "authors",
    move: "new" as Move,
  },
  {
    label: "layer1.studio",
    href: "/domains/layer1.studio",
    value: "7",
    noun: "authors",
    move: 8 as Move,
  },
];

const ZAPS = [
  {
    kicker: "Most zapped note",
    amount: "8,683 sats",
    title: "Yes, the Lambo bros are louder.",
    detail: "14 zaps · largest 420 sats",
    move: 2 as Move,
  },
  {
    kicker: "Largest single zap",
    amount: "21,000 sats",
    title: "Micael → paul keating",
    detail: "“LFG” · 4 hours ago",
    move: "new" as Move,
  },
  {
    kicker: "Most generous",
    amount: "42,100 sats",
    title: "btcschellingpt",
    detail: "Across 19 notes · 31 recipients",
    move: 4 as Move,
  },
];

const LIVE = [
  {
    title: "Beatbox set",
    by: "Beatbox Serenade",
    detail: "86 watching · started 18 minutes ago",
  },
  {
    title: "Office hours",
    by: "Gzuuus",
    detail: "24 watching · started 41 minutes ago",
  },
];

const PULSE = [
  {
    label: "Note authors (24h)",
    value: "3.7K",
    hint: "about the same as a typical Monday",
    points: series([3.4, 3.6, 3.2, 3.8, 3.5, 3.3, 3.6, 3.9, 3.5, 3.4, 3.8, 3.7]),
  },
  {
    label: "Note volume (24h)",
    value: "42.1K",
    hint: "about the same as a typical Monday",
    points: series([39, 41, 36, 44, 40, 38, 42, 45, 41, 40, 43, 42]),
  },
  {
    label: "Sats zapped (24h)",
    value: "255.6K",
    hint: "up from a typical Monday",
    points: series([180, 190, 170, 210, 200, 195, 220, 240, 230, 210, 250, 256]),
  },
  {
    label: "Relay event volume (24h)",
    value: "447.9K",
    hint: "a spike this afternoon",
    points: series([300, 310, 290, 320, 305, 298, 330, 410, 460, 390, 340, 448]),
  },
];

function series(values: number[]): SeriesPoint[] {
  return values.map((v, t) => ({ t, v }));
}

function Movement({ move }: { move?: Move }) {
  if (move == null || move === 0) return null;
  if (move === "new") {
    return (
      <span className="text-accent-ink text-[11px] font-semibold tracking-[0.12em] uppercase">
        New
      </span>
    );
  }
  const up = move > 0;
  const places = Math.abs(move);
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-xs font-medium tabular-nums ${
        up ? "text-accent-ink" : "text-ink-faint"
      }`}
      aria-label={`${up ? "Up" : "Down"} ${places} ${places === 1 ? "place" : "places"}`}
    >
      <span aria-hidden>{up ? "↑" : "↓"}</span>
      {places}
    </span>
  );
}

function Rank({ value }: { value: number }) {
  return (
    <span className="text-accent-ink w-8 shrink-0 pt-0.5 text-lg tabular-nums">
      {String(value).padStart(2, "0")}
    </span>
  );
}

function Avatar({ name }: { name: string }) {
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.replace(/[^\p{L}\p{N}]/gu, "")[0] ?? "")
    .join("")
    .toUpperCase();
  return (
    <span
      aria-hidden
      className="border-edge bg-surface-elevated text-ink-soft grid size-9 shrink-0 place-items-center rounded-full border text-[11px] font-semibold"
    >
      {initials || "•"}
    </span>
  );
}

function Figure({ value, noun }: { value: string; noun: string }) {
  return (
    <span className="inline-flex shrink-0 flex-col items-end gap-1">
      <span className="text-ink text-lg leading-none font-medium tracking-[-0.04em] tabular-nums">
        {value}
      </span>
      <span className="text-ink-faint text-[10px] leading-none font-medium tracking-[0.14em] uppercase">
        {noun}
      </span>
    </span>
  );
}

function SectionHeader({
  kicker,
  title,
  headingId,
  lede,
  action,
}: {
  kicker: string;
  title: string;
  headingId: string;
  lede?: string;
  action?: { href: string; label: string };
}) {
  return (
    <div className="flex items-end justify-between gap-4">
      <div className="min-w-0">
        <p className="nm-kicker">{kicker}</p>
        <h2 id={headingId} className="nm-title text-ink mt-2 scroll-mt-32">
          {title}
        </h2>
        {lede ? <p className="text-ink-muted mt-2 max-w-md text-sm leading-5">{lede}</p> : null}
      </div>
      {action ? (
        <Link href={action.href} className="nm-action-link mb-0.5 shrink-0">
          {action.label}
        </Link>
      ) : null}
    </div>
  );
}

function IndexList({
  rows,
}: {
  rows: Array<{ label: string; href: string; value: string; noun: string; move: Move }>;
}) {
  return (
    <ol className="border-edge/70 mt-5 divide-y divide-[var(--edge)] border-y">
      {rows.map((row, index) => (
        <li key={row.label} className="flex items-center gap-3 py-3">
          <Rank value={index + 1} />
          <Link
            href={row.href}
            className="text-ink min-w-0 flex-1 truncate py-0.5 text-sm font-medium hover:underline"
          >
            {row.label}
          </Link>
          <Movement move={row.move} />
          <Figure value={row.value} noun={row.noun} />
        </li>
      ))}
    </ol>
  );
}

function FormatArt({
  kind,
  duration,
}: {
  kind: "picture" | "video" | "short" | "article";
  duration?: string;
}) {
  if (kind === "article") {
    return (
      <div
        className="bg-surface-sunken relative aspect-[4/3] overflow-hidden rounded-sm p-4"
        aria-hidden
      >
        <p className="text-ink-soft font-display text-lg leading-tight tracking-tight">
          Country-wide mesh networks
        </p>
        <div className="mt-3 space-y-1.5">
          <span className="bg-edge block h-1.5 w-full rounded-full" />
          <span className="bg-edge block h-1.5 w-11/12 rounded-full" />
          <span className="bg-edge block h-1.5 w-4/5 rounded-full" />
          <span className="bg-edge block h-1.5 w-2/3 rounded-full" />
        </div>
      </div>
    );
  }

  const wash =
    kind === "picture"
      ? "linear-gradient(160deg, #e7d3b0 0%, #c4844a 38%, #6a3b22 100%)"
      : kind === "video"
        ? "linear-gradient(165deg, #3a3f46 0%, #1c1e22 70%)"
        : "linear-gradient(180deg, #2a2622 0%, #141311 100%)";

  return (
    <div className="relative aspect-[4/3] overflow-hidden rounded-sm" aria-hidden>
      <div className="absolute inset-0" style={{ background: wash }} />
      {kind === "picture" ? (
        <>
          <div className="absolute right-[16%] bottom-[18%] h-[48%] w-[62%] rounded-[45%] bg-[#f6efe4]/90" />
          <div className="absolute right-[28%] bottom-[30%] h-[18%] w-[24%] rounded-full bg-[#e7b08a]" />
        </>
      ) : (
        <span className="absolute top-1/2 left-1/2 grid size-11 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-[#1c1c1a]">
          <svg width="14" height="16" viewBox="0 0 14 16" aria-hidden>
            <path d="M1 1.2v13.6L13 8 1 1.2Z" fill="currentColor" />
          </svg>
        </span>
      )}
      {duration ? (
        <span className="absolute right-2 bottom-2 rounded-sm bg-black/70 px-1.5 py-0.5 text-[11px] font-medium text-white tabular-nums">
          {duration}
        </span>
      ) : null}
    </div>
  );
}

function PeopleColumn({
  kicker,
  title,
  headingId,
  lede,
  action,
  people,
}: {
  kicker: string;
  title: string;
  headingId: string;
  lede: string;
  action: { href: string; label: string };
  people: Array<{ name: string; handle: string; why: string; move: Move }>;
}) {
  return (
    <section aria-labelledby={headingId}>
      <SectionHeader
        kicker={kicker}
        title={title}
        headingId={headingId}
        lede={lede}
        action={action}
      />
      <ol className="border-edge/70 mt-5 divide-y divide-[var(--edge)] border-y">
        {people.map((person, index) => (
          <li key={person.name} className="flex gap-3 py-3.5">
            <Rank value={index + 1} />
            <Avatar name={person.name} />
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-ink truncate font-medium">{person.name}</p>
                <Movement move={person.move} />
              </div>
              <p className="nm-meta mt-0.5 truncate">{person.handle}</p>
              <p className="nm-evidence mt-1.5">
                <span className="text-ink-faint mr-2 font-semibold tracking-[0.1em] uppercase">
                  Why now
                </span>
                <span className="text-ink-soft">{person.why}</span>
              </p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function OverviewBriefingMock() {
  return (
    <div className="min-w-0 space-y-6 sm:space-y-7">
      <aside className="border-edge bg-surface-raised flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 rounded-md border px-4 py-3 text-sm">
        <p className="text-ink-muted max-w-3xl leading-6">
          <span className="text-ink-soft font-medium">Static mock.</span> Rankings below are
          fixtures for layout review, not live data. Content comes first. Network totals stay at the
          bottom.
        </p>
        <Link href="/" className="nm-action-link shrink-0">
          Live overview
        </Link>
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
          <SectionHeader
            kicker="Notes"
            title="What people are responding to"
            headingId="notes-heading"
            action={{ href: "/trending/notes", label: "All notes" }}
          />
          <div className="mt-6 grid items-start gap-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(18rem,0.9fr)] lg:gap-14">
            <article>
              <div className="flex items-center gap-3">
                <Rank value={1} />
                <Avatar name="Juraj" />
                <div className="min-w-0">
                  <p className="text-ink truncate text-sm font-medium">Juraj</p>
                  <p className="text-ink-faint text-xs">11 hours ago</p>
                </div>
                <div className="ml-auto">
                  <Movement move={2} />
                </div>
              </div>
              <h3 className="text-ink-strong font-display mt-4 text-[1.45rem] leading-snug tracking-[-0.03em] sm:text-[1.7rem]">
                Yes, the Lambo bros are louder.
              </h3>
              <p className="text-ink-soft mt-3 max-w-[40rem] text-[1.02rem] leading-7">
                But there are currently more cyberpunks, more hacktivists and a lot more code, good
                code. Country-wide mesh networks, ecash, and zero-knowledge proofs are already
                deployed.
              </p>
              <p className="nm-evidence mt-4">
                <span className="text-ink-faint mr-2.5 font-semibold tracking-[0.1em] uppercase">
                  Why now
                </span>
                <span className="text-ink-soft">44 reactions in this window</span>
              </p>
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
                {ALSO_MOVING.map((note, index) => (
                  <li key={note.name} className="flex gap-3 py-3">
                    <Rank value={index + 2} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-3">
                        <p className="text-ink truncate text-sm font-medium">
                          {note.name}
                          <span className="text-ink-faint ml-2 font-normal">{note.ago}</span>
                        </p>
                        <Movement move={note.move} />
                      </div>
                      <p className="text-ink-soft mt-1 line-clamp-1 text-sm">{note.line}</p>
                      <p className="nm-evidence mt-1">
                        <span className="text-ink-faint mr-2 font-semibold tracking-[0.1em] uppercase">
                          Why now
                        </span>
                        <span className="text-ink-soft">{note.why}</span>
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>

        <section aria-labelledby="formats-heading">
          <SectionHeader kicker="Formats" title="Leading each format" headingId="formats-heading" />
          <div className="mt-6 flex snap-x snap-mandatory [scrollbar-width:none] gap-5 overflow-x-auto pb-1 [-ms-overflow-style:none] sm:grid sm:grid-cols-2 sm:overflow-visible xl:grid-cols-4 [&::-webkit-scrollbar]:hidden">
            {FORMATS.map((format) => (
              <article key={format.key} className="w-[78%] shrink-0 snap-start sm:w-auto">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h3 className="nm-kicker">{format.label}</h3>
                  <Link href={format.href} className="nm-action-link">
                    Ranking
                  </Link>
                </div>
                <FormatArt kind={format.art} duration={format.duration} />
                <h4 className="text-ink mt-3 font-medium">{format.title}</h4>
                <p className="nm-meta mt-1">
                  {format.by} · {format.ago}
                </p>
                <p className="mt-2 flex items-center gap-2 text-xs">
                  <span className="text-ink-muted">{format.metric}</span>
                  <Movement move={format.move} />
                </p>
              </article>
            ))}
          </div>
        </section>

        <section aria-labelledby="conversations-heading">
          <SectionHeader
            kicker="Conversations"
            title="Threads still growing"
            headingId="conversations-heading"
            action={{ href: "/discovery/conversations/hot", label: "All conversations" }}
          />
          <ol className="border-edge/70 mt-5 divide-y divide-[var(--edge)] border-y">
            {CONVERSATIONS.map((thread, index) => (
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

        <div className="grid gap-14 lg:grid-cols-2 lg:gap-x-14">
          <PeopleColumn
            kicker="People"
            title="People gaining attention"
            headingId="people-gaining"
            lede="Ranked by reactions, replies, and zaps on each note."
            action={{ href: "/trending/profiles", label: "People index" }}
            people={GAINING}
          />
          <PeopleColumn
            kicker="People"
            title="Up and coming"
            headingId="people-rising"
            lede="Smaller accounts whose reach grew in this window."
            action={{ href: "/discovery/profiles/rising", label: "People index" }}
            people={RISING}
          />
        </div>

        <div className="grid gap-14 lg:grid-cols-3 lg:gap-x-10">
          <section aria-labelledby="topics-heading">
            <SectionHeader
              kicker="Topics"
              title="Most used topics"
              headingId="topics-heading"
              action={{ href: "/trending/hashtags", label: "Topic index" }}
            />
            <IndexList rows={TOPICS} />
          </section>
          <section aria-labelledby="links-heading">
            <SectionHeader
              kicker="Links"
              title="Most shared links"
              headingId="links-heading"
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

        <section aria-labelledby="zaps-heading">
          <SectionHeader
            kicker="Zaps"
            title="Where the sats went"
            headingId="zaps-heading"
            action={{ href: "/discovery/notes/zapped", label: "Zapped notes" }}
          />
          <div className="mt-6 grid gap-8 md:grid-cols-3">
            {ZAPS.map((zap) => (
              <article key={zap.kicker} className="border-edge/70 border-t pt-4">
                <h3 className="nm-kicker">{zap.kicker}</h3>
                <p className="text-ink-strong font-display mt-3 text-3xl tracking-[-0.03em] tabular-nums">
                  {zap.amount}
                </p>
                <p className="text-ink mt-3 font-medium">{zap.title}</p>
                <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="nm-meta">{zap.detail}</span>
                  <Movement move={zap.move} />
                </p>
              </article>
            ))}
          </div>
        </section>

        <section aria-labelledby="live-heading">
          <SectionHeader
            kicker="Live"
            title="Happening now"
            headingId="live-heading"
            action={{ href: "/live", label: "All live" }}
          />
          <ol className="border-edge/70 mt-5 divide-y divide-[var(--edge)] border-y">
            {LIVE.map((item, index) => (
              <li key={item.title} className="flex items-center gap-3 py-3">
                <Rank value={index + 1} />
                <span className="nm-live-dot shrink-0" aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="text-ink truncate font-medium">{item.title}</p>
                  <p className="nm-meta mt-0.5">
                    {item.by} · {item.detail}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="pulse-heading" className="border-edge/70 border-t pt-8">
          <SectionHeader
            kicker="Network"
            title="Network pulse"
            headingId="pulse-heading"
            lede="Supporting evidence for this window. Discover itself stays above."
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
