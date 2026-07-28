import http from "node:http";

const port = Number(process.env.MOCK_API_PORT ?? 8080);

function json(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "content-type": "application/json",
    "content-length": Buffer.byteLength(payload),
  });
  res.end(payload);
}

const forceDown = process.env.MOCK_API_FORCE_DOWN === "1";

const FOCAL_ID = "a".repeat(64);
const AUTHOR_PK = "b".repeat(64);
const QUOTED_ID = "c".repeat(64);
const MENTION_PK = "3bf0c63fcb93463407af97a5e5ee64fa883d107ef9e558472c4eb9aaaefa459d";
const MENTION_NPUB = "npub180cvv07tjdrrgpa0j7j7tmnyl2yr6yr7l8j4s3evf6u64th6gkwsyjh6w6";
const QUOTED_NOTE = "note1enxvenxvenxvenxvenxvenxvenxvenxvenxvenxvenxvenxvenxqzqztj2";

const quotedEvent = {
  id: QUOTED_ID,
  pubkey: AUTHOR_PK,
  kind: 1,
  created_at: 1_699_999_000,
  content: "Quoted note body for mock e2e",
};

const focalNote = {
  id: FOCAL_ID,
  pubkey: AUTHOR_PK,
  kind: 1,
  created_at: 1_700_000_000,
  content: `Hello https://example.com #nostr ${MENTION_NPUB} nostr:${QUOTED_NOTE}`,
};

const authorProfile = {
  pubkey: AUTHOR_PK,
  npub: "npub1author",
  display_name: "Mock Author",
  name: "mockauthor",
  about: "Mock author bio",
};

const mentionProfile = {
  pubkey: MENTION_PK,
  npub: MENTION_NPUB,
  display_name: "Mentioned User",
  name: "mentioned",
};

const trendingNotes = [focalNote, quotedEvent];
const trendingProfiles = [authorProfile, mentionProfile];
const trendingHashtags = [
  { hashtag: "nostr", count: 42 },
  { hashtag: "bitcoin", count: 21 },
];
const trendingDomains = [
  { domain: "example.com", count: 12 },
  { domain: "nostrmash.com", count: 8 },
];

function notePayload(id = FOCAL_ID) {
  const note = id === QUOTED_ID ? quotedEvent : { ...focalNote, id };
  return {
    note,
    event: note,
    root: note,
    ancestors: [],
    replies: [],
    counts: { reply_count: 2, reaction_count: 5 },
    seen_on: [{ relay: "wss://relay.example.com" }],
    consistency: "eventual",
  };
}

function readBody(req) {
  return new Promise((resolve) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => {
      const raw = Buffer.concat(chunks).toString("utf8");
      if (!raw) return resolve(null);
      try {
        resolve(JSON.parse(raw));
      } catch {
        resolve(null);
      }
    });
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", `http://127.0.0.1:${port}`);
  const path = url.pathname;

  if (path === "/healthz") {
    return json(res, 200, { ok: true, forceDown });
  }

  if (forceDown) {
    return json(res, 503, {
      error: { code: "dependency_unavailable", message: "Mock API forced down" },
    });
  }

  if (path === "/api/v1/discovery/home") {
    return json(res, 200, {
      notes: trendingNotes,
      profiles: trendingProfiles,
      hashtags: trendingHashtags,
      domains: trendingDomains,
      computed_at: "2026-07-28T12:00:00.000Z",
      consistency: "eventual",
    });
  }

  if (path === "/api/v1/discovery/stats/series") {
    return json(res, 200, {
      metric: url.searchParams.get("metric") ?? "note_volume",
      window: url.searchParams.get("window") ?? "7d",
      computed_at: "2026-07-28T12:00:00.000Z",
      points: [
        { t: 1_700_000_000, v: 10 },
        { t: 1_700_003_600, v: 20 },
        { t: 1_700_007_200, v: 15 },
      ],
      consistency: "eventual",
    });
  }

  if (path === "/api/v1/discovery/stats/network") {
    return json(res, 200, {
      network: { activity: { note_volume: { "24h": 100 }, active_authors: { "24h": 40 } } },
      computed_at: "2026-07-28T12:00:00.000Z",
      consistency: "eventual",
    });
  }

  if (path === "/api/v1/discovery/stats/content" || path === "/api/v1/discovery/stats/relays") {
    return json(res, 200, {
      content: {},
      relays: { total: 3 },
      computed_at: "2026-07-28T12:00:00.000Z",
      consistency: "eventual",
    });
  }

  if (path === "/api/v1/discovery/notes/trending") {
    return json(res, 200, { notes: trendingNotes, consistency: "eventual" });
  }

  if (path === "/api/v1/discovery/profiles/trending") {
    return json(res, 200, { profiles: trendingProfiles, consistency: "eventual" });
  }

  if (path === "/api/v1/discovery/hashtags/trending") {
    return json(res, 200, { hashtags: trendingHashtags, consistency: "eventual" });
  }

  if (path === "/api/v1/discovery/domains/trending") {
    return json(res, 200, { domains: trendingDomains, consistency: "eventual" });
  }

  if (path.startsWith("/api/v1/discovery/hashtags/") && path.endsWith("/notes")) {
    return json(res, 200, { hashtag: "nostr", notes: trendingNotes, consistency: "eventual" });
  }

  if (path.startsWith("/api/v1/discovery/")) {
    return json(res, 200, {
      notes: trendingNotes,
      profiles: trendingProfiles,
      hashtags: trendingHashtags,
      domains: trendingDomains,
      articles: [],
      consistency: "eventual",
    });
  }

  if (path.startsWith("/api/v1/search")) {
    return json(res, 200, {
      notes: trendingNotes,
      profiles: trendingProfiles,
      hashtags: trendingHashtags,
      relays: [],
    });
  }

  if (path === "/api/v1/profiles/batch") {
    const body = (await readBody(req)) ?? {};
    const pubkeys = Array.isArray(body.pubkeys) ? body.pubkeys : [];
    const profiles = [authorProfile, mentionProfile].filter((profile) =>
      pubkeys.length === 0 ? true : pubkeys.includes(profile.pubkey)
    );
    return json(res, 200, { profiles });
  }

  if (path === "/api/v1/events/batch") {
    const body = (await readBody(req)) ?? {};
    const ids = Array.isArray(body.ids) ? body.ids : [];
    const events = [focalNote, quotedEvent].filter((event) =>
      ids.length === 0 ? true : ids.includes(event.id)
    );
    return json(res, 200, { events, missing: [] });
  }

  if (path.startsWith("/api/v1/relays")) {
    return json(res, 200, { relays: [{ host: "relay.example.com", event_count: 10 }] });
  }

  if (path.startsWith("/api/v1/authors/")) {
    return json(res, 200, {
      events: trendingNotes,
      replies: [],
      reactions: [],
      zaps: [],
      consistency: "eventual",
    });
  }

  if (path.startsWith("/api/v1/users/") && path.endsWith("/summary")) {
    return json(res, 200, {
      pubkey: AUTHOR_PK,
      profile: authorProfile,
      hero: {
        display_name: authorProfile.display_name,
        handle: authorProfile.name,
        bio: authorProfile.about,
        counters: { note_count: 3, follower_count: 10 },
      },
      identity_details: {
        fields: [
          {
            key: "npub",
            label: "Npub",
            value: { raw: authorProfile.npub, display: authorProfile.npub, copyable: true },
          },
        ],
      },
      stats: { note_count: 3, follower_count: 10 },
      recent_note_previews: trendingNotes,
      related_discovery: {
        related_profiles: [mentionProfile],
        rising_profiles: [mentionProfile],
      },
      consistency: "eventual",
    });
  }

  if (path.startsWith("/api/v1/profiles/") || path.startsWith("/api/v1/users/")) {
    return json(res, 200, {
      pubkey: AUTHOR_PK,
      profile: authorProfile,
      recent_note_previews: trendingNotes,
      related_discovery: { related_profiles: [mentionProfile], rising_profiles: [mentionProfile] },
    });
  }

  if (
    path.startsWith("/api/v1/notes/") ||
    path.startsWith("/api/v1/events/") ||
    path.startsWith("/api/v1/threads/")
  ) {
    const parts = path.split("/").filter(Boolean);
    const id = parts[3] && /^[a-f0-9]{64}$/i.test(parts[3]) ? parts[3].toLowerCase() : FOCAL_ID;
    if (path.endsWith("/ancestors") || path.endsWith("/replies") || path.endsWith("/related")) {
      return json(res, 200, { events: [], notes: [], ancestors: [], replies: [] });
    }
    if (path.endsWith("/seen-on")) {
      return json(res, 200, { seen_on: [{ relay: "wss://relay.example.com" }] });
    }
    if (path.endsWith("/counts")) {
      return json(res, 200, { counts: { reply_count: 2, reaction_count: 5 } });
    }
    if (path.endsWith("/activity")) {
      return json(res, 200, { activity: [] });
    }
    return json(res, 200, notePayload(id));
  }

  return json(res, 200, {});
});

server.listen(port, "127.0.0.1", () => {
  console.log(`[mock-api] listening on http://127.0.0.1:${port}`);
});
