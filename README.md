# nostrmash-web

Public explorer and analytics web surface for NostrMash.

## Stack

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS v4
- Cloudflare Workers deployment via OpenNext

## Routes

| Route                          | Purpose                     |
| ------------------------------ | --------------------------- |
| `/`                            | Discovery home              |
| `/search`                      | Search notes and profiles   |
| `/profiles/[pubkeyOrNpub]`     | Profile detail and activity |
| `/notes/[eventId]`             | Note detail and thread      |
| `/trending`                    | Trending hub                |
| `/trending/notes`              | Trending notes              |
| `/trending/profiles`           | Trending profiles           |
| `/trending/hashtags`           | Trending hashtags           |
| `/trending/domains`            | Trending domains            |
| `/trending/long-form`          | Trending long-form          |
| `/discovery/conversations/hot` | Hot conversations           |
| `/discovery/profiles/rising`   | Rising profiles             |
| `/hashtags/[hashtag]`          | Hashtag detail              |
| `/hashtags/[hashtag]/notes`    | Notes for a hashtag         |
| `/domains/[domain]`            | Domain detail               |
| `/domains/[domain]/notes`      | Notes for a domain          |
| `/relays`                      | Relay explorer              |
| `/relays/[relayHost]`          | Relay detail                |
| `/relays/health`               | Relay health                |
| `/relays/popular`              | Popular relays              |
| `/relays/probe-health`         | Probe health                |
| `/stats`                       | Network and content stats   |
| `/methodology`                 | How to interpret the index  |

Primary nav: Home, Search, Trends, Relays, Methodology.

## API contract

The web app consumes the existing NostrMash public REST API (for example `/api/v1/search`, `/api/v1/profiles/{pubkey}`, `/api/v1/discovery/*`) and keeps business logic in the backend. It does not talk to Nostr relays directly.

Set your API base URL in `.env.local`:

```bash
cp .env.example .env.local
```

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

Before deploy, make sure you have:

- configured Cloudflare auth for Wrangler
- created the R2 bucket from `wrangler.jsonc`
- set environment values (for example `NOSTRMASH_API_BASE_URL`) in Worker settings
