# NostrMash product design contract

## Product promise

NostrMash explains what is moving on Nostr, who is shaping it, and why it matters.
Discovery is the default experience; profile and network intelligence provide depth;
search is a globally available utility.

## Audience and progressive disclosure

- Newcomers see names, summaries, plain-language momentum, freshness, and clear next actions.
- Experienced users can reveal identifiers, relay evidence, protocol metadata, and diagnostics.
- Technical detail never competes with the primary story, but remains one interaction away.

## Information architecture

- **Discover** is the default destination and owns Overview, Notes, Conversations, People,
  Topics, and Links. A shared 24-hour/7-day selector changes the context without changing
  the destination name.
- **Network** owns aggregate activity, relays, health, and operational statistics.
- **Search** is available from every page. `/search` remains the durable, shareable results
  state rather than a primary navigation destination.
- Notes, profiles, hashtags, domains, and relays are destination pages reached from
  discovery, network, or search.
- Methodology is linked beside rankings and from the footer.

## Content hierarchy

1. The primary signal or answer.
2. A concise explanation of why it is moving.
3. Timeframe, freshness, confidence, and source context.
4. Supporting notes, people, topics, or network evidence.
5. Secondary actions and technical details.

Every ranking must answer: what changed, over which period, how fresh the evidence is, and
why the item appears here.

## Voice

- Direct, calm, and specific.
- Prefer “gaining attention over the last 24 hours” to “posting momentum.”
- Avoid unexplained protocol language in primary copy.
- Never call stale data live. Preserve useful stale results and state their age.
- Errors explain impact and recovery before implementation detail.

## Design principles

- Quiet authority: editorial focus with analytical precision.
- One dominant signal per viewport.
- Content before containers; dividers and spacing before cards.
- A neutral field with one signature signal accent and restrained semantic color.
- Typography, alignment, rhythm, and state quality create premium character.
- Motion communicates continuity, causality, or fresh data; it is never ambient delay.
- Loading, empty, stale, offline, partial-error, and fatal states are first-class designs.

## Success measures

- A first-time visitor identifies the product purpose and leading signal within five seconds.
- Discovery categories are reachable without understanding Nostr protocol terms.
- Users can explain why a ranking moved after inspecting one item.
- Search can be opened from any page by pointer, touch, `/`, or Command/Ctrl+K.
- No serious or critical accessibility violations in supported themes and viewports.
- Core Web Vitals target LCP <= 2.5s, INP <= 200ms, and CLS <= 0.1 at p75.

## Prohibited patterns

- Nested card walls, pill soup, decorative dashboard metrics, or arbitrary radii.
- Tiny low-contrast text used to resolve hierarchy.
- Ubiquitous glow, blur, gradients, or generic decorative icons.
- User media determining the page grid.
- Blanket page-enter animation or motion without a causal relationship.
- Generic error alerts that discard successful sections or hide stale usable data.
