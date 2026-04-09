# nostrmash-web

Public explorer and analytics web surface for NostrMash.

## Stack

- Next.js 16 App Router
- TypeScript
- Tailwind CSS
- Cloudflare Workers deployment via OpenNext

## Routes in v1

- `/`
- `/search`
- `/profiles/[pubkeyOrNpub]`
- `/notes/[eventId]`
- `/trending`
- `/trending/notes`
- `/trending/profiles`
- `/trending/hashtags`
- `/stats`
- `/methodology`

## API contract

The web app consumes the existing NostrMash public REST API (for example `/api/v1/search`, `/api/v1/profiles/{pubkey}`, `/api/v1/discovery/*`) and keeps business logic in the backend.

Set your API base URL in `.env.local`:

```bash
cp .env.example .env.local
```

## Local development

```bash
npm install
npm run dev
```

## Quality checks

```bash
npm run lint
npm run build
```

## Cloudflare deployment

OpenNext and Wrangler config live in:

- `open-next.config.ts`
- `wrangler.jsonc`

Useful scripts:

```bash
npm run cf:build
npm run cf:preview
npm run cf:deploy
```

Before deploy, make sure you have:

- configured Cloudflare auth for Wrangler
- created the R2 bucket from `wrangler.jsonc`
- set environment values (for example `NOSTRMASH_API_BASE_URL`) in Worker settings
