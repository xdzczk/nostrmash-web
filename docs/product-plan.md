# NostrMash product plan

Updated analysis of nostrmash.com (8 Nov 2026) and a comprehensive plan to close every
issue identified in the 6 Nov and 8 Nov reviews. Companion to `product-design.md`, which
remains the design contract; this document is the backlog that gets the live product to
that contract and beyond it.

---

## Part 1 — Updated analysis (8 Nov 2026)

### What improved since 6 Nov

- **Markdown in kind-1 previews.** `lib/notes/lightweight-markdown.ts` splits headings,
  quotes, and paragraphs and strips inline emphasis. The hero no longer shows `###` or `>`.
- **Stats restructured by theme.** `/stats` now has Overview, Activity, Zaps, People,
  Moderation, Relays, Communities, each led by a computed sentence from
  `lib/stats/headlines.ts` ("484 people zapped 495 people 315.6K sats in the last day").
  This is the data-driven-headline pattern the 6 Nov review asked to generalize.
- **Profile insights** split into their own section with Graph, Zaps, Moderation,
  Identities, exposing real intelligence: net followers 7d/30d, reciprocity, follow-back
  rate, ghost followers, downvote ratio.
- **Note page** has trusted-engagement share, a thread summary line
  ("34 replies · 30 in the last day · 26 people"), and label count.
- **Hygiene.** Custom emoji shortcodes rendered, machine labels hidden, duplicate labels
  grouped, internal relays hidden from the relay list, latency formatted as a duration,
  Discover tabs scroll on narrow screens, "All languages" no longer snaps back to a saved
  language, empty search notes dropped, singular/plural counts fixed.

### New regressions introduced by those changes

1. **Lead note lost its display size.** `EditorialNote` (lead) wraps `NoteBody` with
   `size="detail"`, whose `nm-note-body` class sets `font-size: clamp(1.0625rem, …,
1.125rem)` and `text-ink`, overriding the outer `text-[clamp(1.35rem,…,2rem)]
text-ink-strong`. Computed size on the live hero is 18px inside a 32px container. The
   hero's one dominant signal is now the same size as the supporting column.
2. **Topics and Links now repeat their own figure as a pill.** Each row shows
   `109 AUTHORS` on the right and a pill beneath reading
   `Why now · breadth of authors · 109 authors`. The 6 Nov code explicitly avoided this
   ("so the line never reads 160 authors · 160 sources"); the "explain why a topic or link
   is ranked" change re-introduced it, as a pill, which the design contract prohibits.
   Links additionally label the same number as `sources` on the right and `authors` in
   the pill.
3. **Relay event volume sparkline spikes 4x** (581.7K on 6 Nov → 2.2M on 8 Nov) with no
   annotation. Almost certainly an ingestion change, not the network. Raw numbers without
   baselines or change-point annotation are now actively misleading.

### Still open from 6 Nov

4. "Why now" vocabulary is model-feature jargon: `combined engagement`,
   `engagement per post · 58 interactions per note`, `repost lift`, `topic lift`,
   `newer in this window`. Two of four "Up and coming" rows still read
   `combined engagement`, which explains nothing.
5. Every number is absolute; none is relative to a baseline (yesterday, this author's
   usual, a typical weekday). Insight requires comparison.
6. Topics and Links top-6 are the same every day (#bitcoin, #nostr, #ai, #news;
   youtube.com, github.com, x.com). `/api/v1/hashtags/emerging` exists and is only used on
   `/trending/hashtags`, not on the overview.
7. No time axis: no archive, no entity timelines, no momentum curves.
8. No "me": no npub paste or NIP-07 to see your network, your reach, your propagation.
9. Coverage: 16 relays indexed; `relay.damus.io` and `relay.mostr.pub` listed by ~100K
   people each but "Not in our index". Every ranking inherits the bias.
10. Static hero copy ("What has the network's attention.") while the relay page and
    stats themes already demonstrate computed headlines.
11. Profile "Engagement per post · 9.26" remains a bare number with no comparison; the new
    Insights are metric cards without context (is 44% reciprocity high?).
12. Mobile hero chrome: kicker, H1, window pills, language select, bridged toggle,
    freshness, tab row, kicker, H2 before the first note. Roughly 60% of the first
    viewport is chrome.
13. "Lead signal / The note to read first" double headline; lead card is the only elevated
    container on a divider-based page.
14. "Seed", "Hop 1", "64% trusted" appear inline without a gloss.
15. Methodology is a footer link only.

### New findings on 8 Nov

16. **Inconsistent numbers for the same metric across pages.** Home Network pulse:
    note volume 29K, authors 2.8K (24h). `/stats` overview: 48,267 and 3,845. `/stats`
    People headline: 3.9K. Different projections, same label, no explanation. For a
    product whose premise is honesty, this is a credibility bug.
17. **Stats has three stacked navigation levels** (Network categories › Statistics
    sections › On this page) plus a 15-link metric selector. The theme split was right;
    the navigation cost was not paid down.
18. **Stats headlines surface alarming facts neutrally.** "63.5K accounts were first seen
    on the latest day" beside "3.9K people posted" is a spam-signup signal presented as a
    growth stat. "Kind 1 notes were 4% of indexed events" uses protocol jargon and reads
    as a problem without saying what the other 96% is.
19. **Note page reaction row is pill soup**: ~20 emoji pills (`+53`, `🔥7`, `🍺6`, … `🤔1`)
    under the engagement counts. Low information, high noise, prohibited pattern.
20. **Note page tells no momentum story.** The page that a ranking links to never says
    where the note ranks, how replies and zaps accrued over time
    (`/api/v1/threads/{root}/activity` exists and `threadActivityPayload` is hard-coded
    `null` in `lib/notes/load-note-page-data.ts`), or how it propagated across relays
    (`/api/v1/events/{id}/seen-on` is fetched but rendered as four relays all "seen 19
    hours ago", with no order or latency).
21. **Note page right column is mostly empty** below a short author card on wide
    screens.
22. **Profile page carries 19 tabs**: 10 activity, 4 insight, 5 list. The split helped
    hierarchy but the count is still a wall.
23. **Author analytics endpoints are unused.** `/api/v1/authors/{pubkey}/analytics/`
    `posting-patterns`, `topics`, `top-notes`, `performance-summary`, `activity-windows`,
    `media-mix` are in the OpenAPI types and not consumed anywhere in `app/` or
    `components/`. The profile intelligence asked for on 6 Nov is largely a frontend task.

### Updated ratings

- Visual design: **7.5 / 10** (was 8). The lead-size regression and new pills are visible
  on the first screen. The system itself is unchanged and still excellent.
- UI/UX: **6.5 / 10** (unchanged). Stats themes, scrolling tabs, and profile insights are
  gains; duplicated figures, three-level stats navigation, 19 profile tabs, and the
  unchanged mobile hero are offsets.
- Product / content value: **5.5 / 10** (was 5). Computed headlines on stats and real
  profile intelligence move the needle. The overview, which is the product, is still a
  list of absolute counts.
- Engineering: **8 / 10** (unchanged). Fast iteration; the regressions suggest the lead
  note and index rows need visual regression coverage.

---

## Part 2 — The plan

### Operating principles

Every item below is judged against five tests. A change ships when it passes all five.

1. **Relative over absolute.** No number appears without a comparison or a baseline
   unless it is an identifier.
2. **Sentence over label.** A reason is a sentence a non-Nostr reader understands, not a
   feature name.
3. **One source of truth per metric.** The same label shows the same number on every
   page, or the label changes.
4. **Chrome earns its pixels.** Controls appear when they change the content under them.
5. **History is a feature.** Anything ranked is also archived.

### Delivery shape

Nine workstreams, roughly sequenced. Phases 0–2 are web-only and can ship in the first
two weeks. Phases 3–7 need backend endpoints and are specified with the API shape the web
expects so backend and web work can proceed in parallel. "Web" means this repo; "API"
means the NostrMash backend (`../nostrmash`).

---

### Phase 0 — Regressions and visible bugs (web, 2–3 days)

**0.1 Restore lead note display size.** Add a `lead` entry to `SIZE_CLASS` in
`components/explorer/note-content.tsx` that sets no font size or color (inherits), and
use `size="lead"` in the lead branch of `EditorialNote`. Alternatively make `nm-note-body`
apply only when the parent has not set a size. Acceptance: computed font size of the lead
note text at 1280px ≥ 28px and color is `--ink-strong`. Add a Playwright assertion.
Fixes: 8 Nov #1.

**0.2 Remove the duplicated figure on Topics and Links.** In `RankedIndex`
(`components/discover/overview/editorial-overview.tsx`) and the equivalent rows on
`/trending/hashtags` and `/trending/domains`: when `reasonsBesideSourceFigure` returns a
reason whose evidence equals the displayed source figure, render nothing. Never render
the reason as a pill; use the existing `nm-evidence` line. Use one noun per surface:
"authors" for both topics and links (the right-hand figure for links currently says
"sources"; `source_breadth` is a count of distinct authors). Acceptance: no row shows the
same number twice; no pill under an index row. Fixes: 8 Nov #2.

**0.3 Annotate change points on sparklines.** `NetworkPulseStrip` and
`components/charts/delta-chart.tsx`: when a series moves more than 2.5x between adjacent
samples, show a small marker and a title "Index coverage changed on {date}" sourced from
a new `coverage_changes` field (see 6.3) or, until that exists, a static list in
`lib/stats/coverage-notes.ts`. Fixes: 8 Nov #3.

**0.4 Reaction row on the note page.** Collapse the emoji breakdown into a single line:
top three emoji with counts, then "+N more" as a disclosure. Remove pill styling.
Fixes: 8 Nov #19.

**0.5 Gloss every term of art inline.** "Seed", "Hop 1", "64% trusted", "bridged",
"nevent". Use a `<abbr>`-style dotted underline with a `title` and a one-line popover on
tap; link to the relevant Methodology anchor. Create `components/ui/term.tsx` and a
glossary in `lib/i18n/glossary.ts`. Fixes: 6 Nov #12, 8 Nov #14.

**0.6 Visual regression coverage.** Add Playwright screenshot tests for the home hero,
one index row, one people row, and the note page header at 390px and 1280px, so the next
copy fix cannot silently change type scale or add containers.

---

### Phase 1 — Language and honesty (web, 1–2 weeks)

**1.1 Rewrite "why now" as comparative sentences.** Replace `REASON_LABELS` in
`lib/discover/reasons.ts` with a sentence builder that takes the reason code, the
evidence value, the unit, and (when available) the baseline, and returns plain English.
Target output:

| Code                         | Today                                          | Target                                                                              |
| ---------------------------- | ---------------------------------------------- | ----------------------------------------------------------------------------------- |
| `reply_velocity`             | rising replies · 40 replies                    | 40 replies in 18 hours, 4x this author's usual                                      |
| `engagement_quality`         | engagement per post · 58 interactions per note | Each note gets about 58 reactions, replies, and zaps                                |
| `combined_engagement`        | combined engagement                            | (never shown; fall through to the strongest concrete reason or show the raw counts) |
| `recency`                    | newer in this window                           | Posted 3 hours ago and already in the top 10                                        |
| `author_breadth`             | breadth of authors · 109 authors               | Used by 109 different people today                                                  |
| `zap_support`                | zap support · 21 zaps                          | 21 people zapped it, 19.7K sats in total                                            |
| `follower_growth`            | follower growth · +8 followers                 | Gained 8 followers today, from a base of 212                                        |
| `relative_engagement_growth` | engagement vs. audience size                   | More engagement than accounts ten times its size                                    |

Until baselines arrive from the API (3.1), use the comparison that is already available
on the row (counts, elapsed time, follower base). Acceptance: no row anywhere renders a
bare reason code label; `combined_engagement` never appears as text. Fixes: 6 Nov #2,
8 Nov #4.

**1.2 One number per metric.** Decide which projection "note volume (24h)" and "note
authors (24h)" mean and use it everywhere. If the discovery projection and the raw index
must both exist, rename one ("notes ranked" vs "notes indexed") and say so in the "About
this data" panel. Audit: `NetworkPulseStrip`, `/stats` overview, `lib/stats/headlines.ts`.
Fixes: 8 Nov #16.

**1.3 Reframe stats headlines that mislead by omission.**
`lib/stats/headlines.ts`:

- People: "3.9K people posted in the last day. 63.5K new keys appeared; most never
  post." Show the posting-rate of new keys if available; otherwise say the second clause
  only when the ratio exceeds 5:1.
- Activity: drop "Kind 1". "Short notes were 4% of indexed events; reactions, zap
  receipts, and relay-list updates were most of the rest."
- Every headline that cites a share should name the dominant remainder.
  Fixes: 8 Nov #18.

**1.4 Number formatting rules.** Add `lib/format/relative.ts`: `vsBaseline(value,
baseline)` → "4x usual", "+37% vs 7-day average", "about the same as usual". Use it in
1.1, 3.x, 5.x. Define rounding rules once (no false precision, as `formatEvidenceValue`
already does).

**1.5 Methodology surfaced in context.** Every ranked section header gets an inline
"How this is ranked" link to the specific Methodology anchor; the footer link stays.
Fixes: 6 Nov #11, 8 Nov #15.

---

### Phase 2 — Chrome, hierarchy, and navigation (web, 1–2 weeks)

**2.1 Collapse the Discover hero.** `components/discover/discover-shell.tsx`:

- Merge the kicker ("Today · English"), window pills, language, bridged toggle, and
  freshness into one row beneath the H1 at ≥ 1024px and a single horizontally scrolling
  row at narrower widths.
- Replace the static H1 on the overview with the computed headline from 3.2; keep the
  current copy as the fallback.
- Drop the subtitle on sub-pages (Notes, People, …) where the H1 already names the list.
- Sticky-compact the tab row after scrolling past the hero.
  Acceptance: at 390px the first note's author row is visible without scrolling.
  Fixes: 6 Nov #9, 8 Nov #12.

**2.2 One headline for the lead.** Remove the "Lead signal" kicker and reduce "The note
to read first" to a section label at kicker size. Decide on one treatment for the lead:
either keep the elevated card and give the supporting column the same surface, or drop
the card and use a heavier top rule plus the display type. Recommendation: drop the card;
let typography and the 2px accent rule carry it. Fixes: 6 Nov #10, 8 Nov #13.

**2.3 Flatten stats navigation.** Keep the Network tabs (Overview, Popular relays,
Status, Statistics). Inside Statistics, replace the second tab row with the theme cards
already on the overview and make each theme a page with its own H1. Remove the "On this
page" rail below 1280px; replace the 15-link metric selector with a `<select>`. Fixes:
8 Nov #17.

**2.4 Reduce profile tabs.** Group activity tabs into "Posts" (Notes, Replies, Articles,
Media, Live), "Engagement" (Reactions, Zaps sent, Highlights), "Curation" (Bookmarks,
Pins, Lists, Interests, Labels), "Safety" (Mute list, Muted by, Moderation). Default to
Posts › Notes. Insights becomes a section above activity, not a tabbed one. Fixes:
8 Nov #22.

**2.5 Note page layout.** Use the right column for the momentum panel (4.3) and
propagation (5.4); move Author to a compact byline card above it. Fixes: 8 Nov #21.

**2.6 Rename "Network".** Mainstream readers do not know what "Network" means here.
Options: "Relays & stats", or split into "Relays" and "Stats" at the top level (three
items). Recommendation: three items, Discover · Relays · Stats. Fixes: 6 Nov #11.

---

### Phase 3 — The editorial briefing (API + web, 3–4 weeks)

This is the core product change: from lists of absolute counts to a computed briefing
with comparisons, stories, and anomalies.

**3.1 Baselines (API).** For every ranked entity type, return alongside each row:

```json
"baseline": {
  "metric": "reply_count",
  "window": "24h",
  "value": 40,
  "typical": 9.5,
  "typical_basis": "author_30d_median",
  "ratio": 4.2,
  "percentile": 0.98
}
```

Bases: author's own 30-day median (notes, people), the entity's 30-day median (topics,
links, relays), and the network's same-weekday median (pulse metrics). Rows may carry
several baselines; the web picks the strongest for the sentence (1.1) and shows the rest
on hover/expansion.

**3.2 Computed overview headline (API + web).** New endpoint
`/api/v1/discovery/briefing?window=24h&lang=en` returning 3–5 ranked "findings", each a
template id plus parameters, e.g. `{"template": "topic_spike", "topic": "halloween",
"authors": 22, "ratio": 9.1}`. Web renders the top finding as the H1 and the rest as a
"Today in brief" list under it. Templates to start:

- `topic_spike` — "#halloween is in 22 people's notes today, 9x its usual."
- `story_cluster` — "Three of the five leading notes are about Zapstore and Google Play."
- `link_surge` — "31 people shared a Guardian article; that domain usually gets 4."
- `zap_outlier` — "One note received 19.7K sats, the most this week."
- `rising_account` — "@name gained 307 followers in 7 days from a base of 14K."
- `network_quiet` / `network_busy` — "The network is 23% quieter than a typical Saturday."

Acceptance: the overview H1 is computed on ≥ 90% of loads; fallback copy otherwise.
Fixes: 6 Nov #1, #7, 8 Nov #10.

**3.3 Stories instead of isolated notes (API + web).** Cluster leading notes by shared
quoted event, shared URL, shared hashtag set, and reply-graph proximity. Return clusters
with a label (the dominant link title, hashtag, or quoted note excerpt), member notes,
distinct authors, and the baseline for the cluster. Web renders a story as: label, lead
note, "N more notes from M people", expandable. The "Also moving" column becomes other
stories, not other notes. Fixes: 6 Nov #1, #6.

**3.4 "Unusual today" replaces volume-ranked Topics and Links on the overview.** Use
`/api/v1/hashtags/emerging` (exists) and a new `/api/v1/discovery/domains/emerging`
ranked by ratio-to-baseline with a minimum author floor. Keep the volume rankings on
their own pages; label them "Most used" and "Most shared". On the overview, if the
emerging list is empty, hide the section rather than show the daily incumbents. Fixes:
6 Nov #5.

**3.5 Sparklines beside every ranked number.** Each row carries a 7-point
`series` (daily values); render a 60×16 sparkline after the figure on index rows,
people rows, and pulse tiles. Fixes: 6 Nov #3.

**3.6 Pulse tiles become comparisons.** "2.8K people posted · 12% below a typical
Saturday" with sparkline; never a bare count. Fixes: 6 Nov #3.

---

### Phase 4 — Time axis (API + web, 2–3 weeks)

**4.1 Daily archive.** Snapshot the overview (findings, stories, rankings) once per UTC
day. API: `/api/v1/discovery/archive/{YYYY-MM-DD}`. Web: `/day/{date}` with previous/next
navigation, and a date picker in the hero on the overview. Sitemap includes archive days.
Fixes: 6 Nov #8.

**4.2 Entity timelines.** Hashtag, domain, relay, and profile pages get a 30/90-day chart
of their primary metric with baseline band and change-point markers. Reuse
`components/charts/delta-chart.tsx`. Fixes: 6 Nov #8.

**4.3 Note momentum panel.** Wire `/api/v1/threads/{root}/activity` (currently
hard-coded `null` in `lib/notes/load-note-page-data.ts`) into a chart of replies, reposts,
reactions, and zaps per hour since posting, with the moment it entered the top 10 marked.
Show "Ranked #1 for notes · 24h · English" when the note is on a ranking, with a link to
the ranking. Fixes: 8 Nov #20.

**4.4 Rank history on rankings.** Extend rank movement arrows with "held #1 for 3 days"
or "new today" from the archive.

**4.5 Reviews.** `/week/{iso-week}` and `/month/{YYYY-MM}` generated from the archive:
the top finding each day, the most-held #1, the biggest riser, the most zapped. These are
the pages people will share.

---

### Phase 5 — Profile and note intelligence (web first, 2 weeks; small API additions)

**5.1 Wire the unused author analytics endpoints.** `posting-patterns`,
`activity-windows`, `topics`, `top-notes`, `performance-summary`, `media-mix` are in
`lib/types/generated/api.d.ts` and unconsumed. Add fetchers in
`lib/api/endpoints/profiles.ts` and render:

- **Rhythm**: posting hours heatmap (UTC with local toggle), active days.
- **Topics**: top hashtags and link domains with share.
- **Best posts**: top notes by engagement in 30 days.
- **Format mix**: notes / articles / pictures / video.
  Fixes: 6 Nov #9 (profile), 8 Nov #23.

**5.2 Make every profile number comparative.** "Engagement per post 9.26 · top 3% of
accounts with 10K–20K followers." "Reciprocity 44% · typical for accounts this size is
31%." Requires cohort baselines from 3.1 keyed by follower band. Fixes: 6 Nov #9,
8 Nov #11.

**5.3 Audience and amplifiers.** "Who amplifies this account" (top reposters, zappers,
repliers in 30 days, from `/users/{pubkey}/mentions` and `/authors/{pubkey}/zaps`) and
"Audience overlap" with related profiles.

**5.4 Propagation on the note page.** Render `/events/{id}/seen-on` ordered by
first-seen time with elapsed deltas: "First on relay.primal.net · relay.ditto.pub same moment ·
relay.nostr.net +2h". Relays that are shut down (relay.damus.io, relay.mostr.pub) are labeled
offline, not "not indexed". Needs `seen_at` from the API. Fixes: 8 Nov #20.

**5.5 Trust path.** On the Trust mark popover, show the shortest path: "2 hops from a
seed, via @name". API: `/api/v1/trust/scores/{pubkey}` extended with `path`.

---

### Phase 6 — Relay intelligence and coverage (API + web, 2–3 weeks)

**6.1 Leave shut-down relays out.** relay.damus.io and relay.mostr.pub are offline and
unresponsive. Do not add them to the index. Say so in the coverage statement, including how
many accounts still list them. Other relays people list are candidates only when they respond.

**6.2 Coverage statement, prominently.** On `/relays` and in "About this data":
"This index reads N of the M most-listed relays on this page, covering P% of the relay-list
entries in that list. relay.damus.io and relay.mostr.pub are offline." The percentage is of
the list on the page, not of every relay list on the network. Fixes: 6 Nov #7.

**6.3 Coverage change log (API).** `/api/v1/relays/coverage-changes` returning dated
events ("Added relay.damus.io", "Dropped fallback:relay") used by 0.3 to annotate series.

**6.4 Relay operator view.** `/relays/{host}` gets: exclusive share, first-seen share,
p50 latency vs. peer median, who lists it (count and 7-day change), overlap with its three
nearest neighbours, software and NIPs from `relays/info`, uptime from probes. Add
"Compare" to put two relays side by side. Fixes: 6 Nov (relay intelligence first-class).

**6.5 Promote Relays to the top nav** (see 2.6).

---

### Phase 7 — "Me": personalization without accounts (web + API, 3 weeks)

**7.1 Identity entry.** A "Your view" button in the header: paste an npub, or sign with
NIP-07 if available. Store the pubkey client-side only (localStorage); no server account.

**7.2 Your network's briefing.** `/api/v1/discovery/briefing?viewer={pubkey}` restricts
findings, stories, and rankings to the viewer's follows and their follows (two hops).
Overview gets a "Network / Everyone" toggle.

**7.3 Your reach.** `/me` page from existing endpoints: your top notes this week, who
amplified you (5.3), followers gained, where your notes were seen first (5.4 aggregated),
your rank history if you have appeared on any list.

**7.4 Follow suggestions with reasons.** "Up and coming accounts three of your follows
started following this week."

Fixes: 6 Nov #6 (no "me").

---

### Phase 8 — Distribution (web + small API, 1–2 weeks)

**8.1 Daily briefing as a Nostr long-form note.** A NostrMash npub posts the archive
day (4.1) as a kind-30023 article each UTC midnight, with links back. Zappable; the
natural native channel.

**8.2 Email digest.** Daily or weekly, rendered from the same archive. Collect addresses
on `/day/*` pages.

**8.3 Embeds and badges.** Extend oEmbed (`app/api/oembed`) to rankings and stories;
offer a "Ranked #N on NostrMash" badge image per note/profile.

**8.4 Developers page.** `/developers` publishing the OpenAPI, rate limits, and example
calls. Builders are a core Nostr audience and the API already exists.

Fixes: 6 Nov (native distribution, developer surface).

---

### Phase 9 — Mainstream mode (web, 1–2 weeks)

**9.1 Topic-first entry.** "Browse by interest" strip on the overview: Bitcoin, Tech,
Art & Photography, News, Music, Science, with each mapped to a hashtag set and rendered as
a filtered overview.

**9.2 Thirty-second orientation.** A dismissible one-paragraph "What is Nostr, what is
this" with a link to a `/about` page. Show once.

**9.3 "Open in app" everywhere.** Extend the profile "Open in app" (client choice) to
notes, hashtags, and relays.

**9.4 Plain names in navigation and headers.** Audit every label against "would a
newspaper reader understand it": kicker "Ideas" → "Topics"; "Links circulating" →
"Most shared links"; "Profiles in motion" → "People gaining attention".

Fixes: 6 Nov (mainstream orientation).

---

### Cross-cutting

**Measurement.** Add events for: computed-headline impression, story expansion, archive
navigation, "Your view" activation, "How this is ranked" clicks. Success metrics: 7-day
return rate, archive page share of sessions, "Your view" activation rate, median time to
first content on mobile.

**QA gates per phase.** `pnpm validate && pnpm test && pnpm test:e2e` plus the visual
regression suite from 0.6; axe at 390px and 1280px in both themes; LCP ≤ 2.5s on the
overview with the briefing endpoint streamed behind Suspense.

**Design contract updates.** Add to `product-design.md`: "No absolute count without a
comparison", "Reasons are sentences", "Every ranking has an archive", and "One number per
metric label".

---

## Part 3 — Issue register

Every issue from both reviews, mapped to the item that closes it.

| #   | Issue                                                  | Source | Closed by                   |
| --- | ------------------------------------------------------ | ------ | --------------------------- |
| 1   | Hero shows raw markdown                                | 6 Nov  | Done (lightweight-markdown) |
| 2   | literal Video markdown in the media card               | 6 Nov  | Done (verify in 0.6)        |
| 3   | Lead note lost display size                            | 8 Nov  | 0.1                         |
| 4   | Topics/Links repeat figure as pill; sources vs authors | 8 Nov  | 0.2                         |
| 5   | Unannotated 4x spike in relay volume                   | 8 Nov  | 0.3, 6.3                    |
| 6   | Reaction row pill soup                                 | 8 Nov  | 0.4                         |
| 7   | Unexplained terms (Seed, Hop, trusted, bridged)        | both   | 0.5                         |
| 8   | No visual regression coverage                          | 8 Nov  | 0.6                         |
| 9   | "Why now" is jargon; `combined engagement`             | both   | 1.1                         |
| 10  | Same metric, different numbers across pages            | 8 Nov  | 1.2                         |
| 11  | Stats headlines mislead by omission / jargon           | 8 Nov  | 1.3                         |
| 12  | Absolute counts without baseline                       | both   | 1.4, 3.1, 3.5, 3.6, 5.2     |
| 13  | Methodology only in footer                             | both   | 1.5                         |
| 14  | Mobile hero is mostly chrome                           | both   | 2.1                         |
| 15  | Double headline on lead; lone elevated card            | both   | 2.2                         |
| 16  | Three-level stats navigation                           | 8 Nov  | 2.3                         |
| 17  | 19 tabs on profile                                     | 8 Nov  | 2.4                         |
| 18  | Note page right column empty                           | 8 Nov  | 2.5                         |
| 19  | "Network" label unclear                                | 6 Nov  | 2.6                         |
| 20  | Static hero headline                                   | both   | 3.2                         |
| 21  | Lead content weak vs editorial frame                   | 6 Nov  | 3.2, 3.3                    |
| 22  | Topics/Links identical every day                       | both   | 3.4                         |
| 23  | No time axis / archive                                 | both   | 4.1–4.5                     |
| 24  | Note page has no momentum story                        | 8 Nov  | 4.3                         |
| 25  | Profile numbers bare; analytics endpoints unused       | both   | 5.1, 5.2, 5.3               |
| 26  | Propagation not shown                                  | both   | 5.4                         |
| 27  | Trust path not shown                                   | 6 Nov  | 5.5                         |
| 28  | Coverage gap (damus, mostr)                            | both   | 6.1, 6.2                    |
| 29  | Relay intelligence buried                              | 6 Nov  | 6.4, 6.5                    |
| 30  | No "me" / personalization                              | both   | 7.1–7.4                     |
| 31  | No native distribution                                 | 6 Nov  | 8.1, 8.2                    |
| 32  | No embeds/badges beyond oEmbed                         | 6 Nov  | 8.3                         |
| 33  | No developer surface                                   | 6 Nov  | 8.4                         |
| 34  | No mainstream entry point                              | 6 Nov  | 9.1–9.4                     |

---

## Suggested sequence

- **Week 1:** Phase 0 complete; Phase 1.1 and 1.2 in review.
- **Week 2:** Phase 1 complete; Phase 2.1, 2.2, 2.3 shipped. API work on 3.1 and 3.2 starts.
- **Weeks 3–5:** Phase 2 complete; 3.1–3.4 land behind a flag; 5.1 and 5.4 ship (web-only
  against existing endpoints); 6.1 relay additions begin.
- **Weeks 6–8:** Phase 3 on by default; Phase 4 archive and note momentum; 6.2–6.4.
- **Weeks 9–11:** Phase 7 "Your view"; 8.1 daily briefing note; 8.4 developers page.
- **Week 12:** Phase 9; measurement review against success metrics; contract update.
