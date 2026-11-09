# NostrMash Web

[![CI](https://github.com/xdzczk/nostrmash-web/actions/workflows/ci.yml/badge.svg)](https://github.com/xdzczk/nostrmash-web/actions/workflows/ci.yml)
[![License: Unlicense](https://img.shields.io/badge/license-Unlicense-blue)](LICENSE)

Public explorer for [NostrMash](https://nostrmash.com) ([repository](https://github.com/xdzczk/nostrmash)). Search notes and profiles, and browse trends, relays, and network stats. The site reads the NostrMash API and does not talk to relays itself. SmartFlowSocial's [cache worker](https://github.com/xdzczk/smartflowsocial-cache-worker) calls that same API.

## Stack

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS v4
- Cloudflare Workers deployment via OpenNext

## Routes

| Route                              | Purpose                      |
| ---------------------------------- | ---------------------------- |
| `/`                                | Discovery home               |
| `/search`                          | Search notes and profiles    |
| `/profiles/[pubkeyOrNpub]`         | Profile detail and activity  |
| `/notes/[eventId]`                 | Note detail and thread       |
| `/trending`                        | Trending hub                 |
| `/trending/notes`                  | Trending notes               |
| `/trending/profiles`               | Trending profiles            |
| `/trending/hashtags`               | Trending hashtags            |
| `/trending/domains`                | Trending domains             |
| `/trending/long-form`              | Trending articles            |
| `/trending/pictures`               | Trending pictures            |
| `/trending/videos`                 | Trending videos              |
| `/trending/shorts`                 | Trending shorts              |
| `/discovery/conversations/hot`     | Conversations, under Notes   |
| `/live`                            | Live activities, under Media |
| `/discovery/profiles/rising`       | Rising profiles              |
| `/hashtags/[hashtag]`              | Hashtag detail               |
| `/hashtags/[hashtag]/notes`        | Notes for a hashtag          |
| `/domains/[domain]`                | Domain detail                |
| `/domains/[domain]/notes`          | Notes for a domain           |
| `/relays`                          | Relay explorer               |
| `/relays/[relayHost]`              | Relay detail                 |
| `/relays/health`                   | Relay health                 |
| `/relays/popular`                  | Popular relays               |
| `/relays/probe-health`             | Probe health                 |
| `/stats`                           | Network and content stats    |
| `/methodology`                     | How to interpret the index   |
| `/about`                           | About NostrMash              |
| `/developers`                      | Developer introduction       |
| `/me`                              | Your view                    |
| `/day/[date]`                      | Notes for one day            |
| `/badges/[address]`                | Badge detail                 |
| `/goals`                           | Goals                        |
| `/polls`                           | Polls                        |
| `/groups`                          | Groups                       |
| `/groups/[relayHost]/[...groupId]` | One group                    |
| `/curation-sets`                   | Curation sets                |
| `/curation-sets/[address]`         | One curation set             |
| `/embed/notes/[eventId]`           | Embeddable note              |
| `/discovery/notes/bookmarked`      | Bookmarked notes             |
| `/discovery/notes/zapped`          | Zapped notes                 |
| `/discovery/profiles/followed`     | Followed profiles            |
| `/discovery/profiles/supported`    | Supported profiles           |
| `/stats/activity`                  | Activity stats               |
| `/stats/communities`               | Community stats              |
| `/stats/moderation`                | Moderation stats             |
| `/stats/people`                    | People stats                 |
| `/stats/relays`                    | Relay stats                  |
| `/stats/zaps`                      | Zap stats                    |

Primary nav: Discover, Network, Stats, and Your view (`/me`). Methodology is in the footer.

Route handlers, not pages: `/api/search/suggest`, `/api/discovery-window/unsupported`, `/api/oembed`, `/api/link-preview`, `/feeds/*.xml`, `/img`, and `/video-frame`.

Design notes that are not the operator guide: `docs/product-plan.md`, `docs/product-design.md`, and `docs/discover-art-directions.md`.

## API contract

The web app consumes the existing NostrMash public REST API (for example `/api/v1/search`, `/api/v1/profiles/{pubkey}`, `/api/v1/discovery/*`) and keeps business logic in the backend. It does not talk to Nostr relays directly.

Set your API base URL in `.env.local`:

```bash
cp .env.example .env.local
```

`.env.example` points at `http://localhost:8080`, which is a local [NostrMash](https://github.com/xdzczk/nostrmash) API (`make` / Docker in that repo). The production Worker var is `https://api.nostrmash.com`. `pnpm generate:api-types` reads `../nostrmash/docs/openapi.yaml`, so that checkout has to sit next to this one.

## Local development

```bash
pnpm install
pnpm dev
```

## Quality checks

```bash
pnpm validate
pnpm test
pnpm build
```

`pnpm validate` runs format check, lint, and typecheck.

## Cloudflare deployment

OpenNext and Wrangler config live in:

- `open-next.config.ts`
- `wrangler.jsonc`

Useful scripts:

```bash
pnpm cf:build
pnpm cf:preview
pnpm cf:deploy
```

`pnpm cf:deploy` is `wrangler deploy --keep-vars`, so dashboard vars are kept. Other scripts: `cf:typegen`, `prod:validate`, `test:e2e`, `generate-icons`, `generate:api-types`.

Before deploy, make sure you have:

- configured Cloudflare auth for Wrangler
- created the R2 bucket named in `wrangler.jsonc` (`nostrmash-web-opennext-cache`, binding `NEXT_INC_CACHE_R2_BUCKET`)
- set `NOSTRMASH_API_BASE_URL` and `NEXT_PUBLIC_SITE_URL` (the checked-in `wrangler.jsonc` already sets the production values)
- the `WORKER_SELF_REFERENCE` service binding (`nostrmash-web`), the Images binding, and the `SUGGEST_RATE_LIMITER` rate limit (`namespace_id` is account-specific)

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). This project follows the [Code of Conduct](CODE_OF_CONDUCT.md). Report security issues through [SECURITY.md](SECURITY.md).

## License

Released into the public domain under the [Unlicense](LICENSE).
