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
// Profile page fixtures: a pubkey the API has never seen (hard 404) and one
// whose related-profiles endpoint is degraded to a trending fallback.
const UNKNOWN_PK = "d".repeat(64);
const DEGRADED_RELATED_PK = "e".repeat(64);
// 1×1 PNG used as the author's banner so the hero backdrop renders. Served as a
// data: URL because the site CSP only allows https: (and data:) image sources.
const MOCK_BANNER_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";
const MOCK_BANNER_DATA_URL = `data:image/png;base64,${MOCK_BANNER_PNG_BASE64}`;

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
  reply_count: 12,
  repost_count: 7,
  reaction_count: 24,
  ranking: {
    rank: 1,
    score: 42.5,
    confidence: "high",
    source_breadth: 8,
    reasons: [
      {
        code: "reply_velocity",
        evidence: [{ metric: "reply_count", value: 12, unit: "replies" }],
      },
    ],
  },
};

// --- Note page thread fixtures -------------------------------------------
// A direct reply, a nested reply (rendered one level deep with "replying to"),
// two identical replies from one author (folded), a kind-6 repost of another
// note and a kind-6 repost of the focal note (collapses to one line), plus a
// second page of replies behind `next_cursor`.
const REPLIER_PK = "d".repeat(64);
const NESTED_PK = "e".repeat(64);
const DUP_PK = "f".repeat(64);
const REPOSTER_PK = "1".repeat(64);
const REPLY_A_ID = "2".repeat(64);
const REPLY_B_ID = "3".repeat(64);
const DUP_1_ID = "4".repeat(64);
const DUP_2_ID = "5".repeat(64);
const REPLY_C_ID = "6".repeat(64);
const REPLY_D_ID = "9".repeat(64);
const REPOST_OTHER_ID = "7".repeat(64);
const REPOST_FOCAL_ID = "8".repeat(64);
const REPLIES_CURSOR_2 = "mock_replies_cursor_2";

const replyA = {
  id: REPLY_A_ID,
  pubkey: REPLIER_PK,
  kind: 1,
  created_at: 1_700_000_100,
  // Media detection requires https; the host never resolves in CI, which is
  // fine because the assertions are about layout classes, not pixels.
  content: "First direct reply with a tall image https://media.example.invalid/tall.png",
  tags: [
    ["e", FOCAL_ID, "", "root"],
    ["p", AUTHOR_PK],
  ],
  reply_count: 1,
};
const replyB = {
  id: REPLY_B_ID,
  pubkey: NESTED_PK,
  kind: 1,
  created_at: 1_700_000_200,
  content: "Nested reply to the first reply",
  tags: [
    ["e", FOCAL_ID, "", "root"],
    ["e", REPLY_A_ID, "", "reply"],
    ["p", REPLIER_PK],
  ],
};
// Depth-2 reply: flattened under the top-level ancestor with "replying to".
const replyD = {
  id: REPLY_D_ID,
  pubkey: REPLIER_PK,
  kind: 1,
  created_at: 1_700_000_250,
  content: "Deep reply to the nested reply",
  tags: [
    ["e", FOCAL_ID, "", "root"],
    ["e", REPLY_B_ID, "", "reply"],
    ["p", NESTED_PK],
  ],
};
const duplicateReply = (id, createdAt) => ({
  id,
  pubkey: DUP_PK,
  kind: 1,
  created_at: createdAt,
  content: "Same reply posted twice",
  tags: [["e", FOCAL_ID, "", "root"]],
});
const replyC = {
  id: REPLY_C_ID,
  pubkey: REPLIER_PK,
  kind: 1,
  created_at: 1_700_000_500,
  content: "Second page reply loaded in place",
  tags: [["e", FOCAL_ID, "", "root"]],
};
const repostOfOther = {
  id: REPOST_OTHER_ID,
  pubkey: REPOSTER_PK,
  kind: 6,
  created_at: 1_700_000_600,
  content: JSON.stringify(quotedEvent),
  tags: [
    ["e", QUOTED_ID],
    ["p", AUTHOR_PK],
  ],
};
// Related entries come back wrapped in an `event` envelope with only a subset
// of fields lifted to the top level (mirrors the production API).
const relatedRepostOfFocal = {
  event_id: REPOST_FOCAL_ID,
  author_pubkey: REPOSTER_PK,
  content: "",
  created_at: 1_700_000_700,
  counts: { reaction_count: 0, reply_count: 0, repost_count: 0, zap_count: 0, zap_msats: 0 },
  reasons: ["repost_linkage"],
  score: 51,
  event: {
    id: REPOST_FOCAL_ID,
    pubkey: REPOSTER_PK,
    kind: 6,
    created_at: 1_700_000_700,
    content: "",
    tags: [
      ["e", FOCAL_ID],
      ["p", AUTHOR_PK],
    ],
  },
};
const threadProfiles = [
  { pubkey: REPLIER_PK, npub: "npub1replier", display_name: "Replier One", name: "replier" },
  { pubkey: NESTED_PK, npub: "npub1nested", display_name: "Nested Nancy", name: "nested" },
  { pubkey: DUP_PK, npub: "npub1dup", display_name: "Double Dan", name: "dup" },
  { pubkey: REPOSTER_PK, npub: "npub1reposter", display_name: "Rhea Reposter", name: "rhea" },
];

const authorProfile = {
  pubkey: AUTHOR_PK,
  npub: "npub1author",
  display_name: "Mock Author",
  name: "mockauthor",
  about: "Mock author bio",
  nip05: "_@mockauthor.example",
  banner: MOCK_BANNER_DATA_URL,
  fields: [["GitHub", "https://github.com/mockauthor"]],
  recent_post_count: 8,
  recent_new_followers: 14,
  ranking: {
    rank: 1,
    score: 31,
    confidence: "medium",
    reasons: [
      {
        code: "follower_growth",
        evidence: [{ metric: "recent_new_followers", value: 14, unit: "followers" }],
      },
    ],
  },
};

const mentionProfile = {
  pubkey: MENTION_PK,
  npub: MENTION_NPUB,
  display_name: "Mentioned User",
  name: "mentioned",
};

const degradedSubjectProfile = {
  pubkey: DEGRADED_RELATED_PK,
  display_name: "Lonely Account",
  name: "lonely",
  about: "Profile whose related list is degraded in the mock API",
};

// A note with an image attachment so the overview's compact (thumbnail) note
// layout is exercised in the ui-quality snapshots. The host never resolves in
// CI, which is fine: the assertions are about layout, not pixels.
const mediaNote = {
  id: "0".repeat(64),
  pubkey: AUTHOR_PK,
  kind: 1,
  created_at: 1_700_000_050,
  content: "A note with a tall image https://media.example.invalid/tall.png",
  tags: [],
  reply_count: 2,
  repost_count: 1,
  reaction_count: 3,
};
const trendingNotes = [focalNote, quotedEvent, mediaNote];
const trendingProfiles = [authorProfile, mentionProfile];
const trendingHashtags = [
  {
    hashtag: "nostr",
    count: 42,
    unique_authors: 18,
    ranking: {
      rank: 1,
      score: 42,
      confidence: "medium",
      reasons: [{ code: "mention_volume", evidence: [{ metric: "event_count", value: 42 }] }],
    },
  },
  { hashtag: "bitcoin", count: 21, unique_authors: 9 },
];
const trendingDomains = [
  {
    domain: "example.com",
    link_count: 12,
    note_count: 11,
    unique_authors: 7,
    ranking: {
      rank: 1,
      score: 12,
      confidence: "low",
      reasons: [{ code: "link_circulation", evidence: [{ metric: "link_count", value: 12 }] }],
    },
  },
  // Legacy shape (pre `link_count`) to keep the fallback path exercised.
  { domain: "nostrmash.com", count: 8 },
];

const threadEventsById = new Map(
  [quotedEvent, replyA, replyB, replyC, replyD].map((event) => [event.id, event])
);

function notePayload(id = FOCAL_ID) {
  const note = threadEventsById.get(id) ?? { ...focalNote, id };
  const author = [authorProfile, ...threadProfiles].find(
    (profile) => profile.pubkey === note.pubkey
  );
  return {
    note,
    event: note,
    root: id === REPLY_B_ID ? focalNote : note,
    author: author ? { profile: author, pubkey: author.pubkey } : undefined,
    ancestors: [],
    replies: [],
    counts: { reply_count: id === FOCAL_ID ? 5 : 2, reaction_count: 5 },
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
    const fixture = url.searchParams.get("fixture");
    const computedAt =
      fixture === "stale" ? "2026-07-28T08:00:00.000Z" : "2026-07-30T11:00:00.000Z";
    const profiles = fixture === "partial" ? [] : trendingProfiles;
    return json(res, 200, {
      surface: "home",
      window: url.searchParams.get("window") ?? "24h",
      computed_at: computedAt,
      ranking_version: "discovery-v1",
      meta: {
        window: url.searchParams.get("window") ?? "24h",
        computed_at: computedAt,
        ranking_version: "discovery-v1",
        confidence: "medium",
      },
      notes: trendingNotes,
      profiles,
      hashtags: trendingHashtags,
      domains: trendingDomains,
      sections: {
        trending_notes: trendingNotes,
        trending_hashtags: trendingHashtags,
        trending_domains: trendingDomains,
        profiles: { trending: profiles, rising: profiles },
        network_summary: {
          totals: { events_ingested: 128400, projected_profiles: 4820 },
          activity: {
            active_authors: { "24h": 4820, "7d": 12900 },
            note_volume: { "24h": 128400, "7d": 588000 },
          },
          relays: {
            total: 3,
            active_24h: 3,
            active_7d: 3,
            unique_authors: { "24h": 4820, "7d": 12900 },
          },
        },
      },
      consistency: "eventual",
    });
  }

  if (path === "/api/v1/discovery/conversations/hot") {
    return json(res, 200, {
      surface: "hot_conversations",
      window: url.searchParams.get("window") ?? "24h",
      computed_at: "2026-07-30T11:00:00.000Z",
      ranking_version: "discovery-v1",
      conversations: [
        {
          ...focalNote,
          root_event_id: focalNote.id,
          participant_count: 8,
          last_activity_at: 1_700_000_120,
          activity: { replies_24h: 12, replies_7d: 19 },
          velocity_score: 42.5,
        },
      ],
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
    // Cursor pagination: a chain of pages so Show more append tests can
    // click repeatedly. Page N advertises the cursor for page N+1; the
    // final page has no cursor.
    const lastMockPage = 5;
    const cursorMatch = /^mock_hashtag_cursor_(\d+)$/.exec(url.searchParams.get("cursor") ?? "");
    if (cursorMatch) {
      const pageNumber = Number(cursorMatch[1]);
      const body = {
        hashtag: "nostr",
        notes: [
          {
            id: String(pageNumber).repeat(64).slice(0, 64),
            pubkey: AUTHOR_PK,
            kind: 1,
            created_at: 1_699_990_000 - pageNumber,
            content: `Mock hashtag pagination page ${pageNumber}`,
          },
        ],
        consistency: "eventual",
      };
      if (pageNumber < lastMockPage) {
        body.next_cursor = `mock_hashtag_cursor_${pageNumber + 1}`;
      }
      return json(res, 200, body);
    }
    return json(res, 200, {
      hashtag: "nostr",
      notes: trendingNotes,
      next_cursor: "mock_hashtag_cursor_2",
      consistency: "eventual",
    });
  }

  if (path.startsWith("/api/v1/discovery/profiles/") && path.endsWith("/related")) {
    const parts = path.split("/").filter(Boolean);
    const pk = parts[4] ?? "";
    if (pk === DEGRADED_RELATED_PK) {
      // Upstream fell back to trending; includes the subject itself, which the
      // UI must drop.
      return json(res, 200, {
        pubkey: pk,
        related_profiles: [degradedSubjectProfile, authorProfile, mentionProfile],
        degraded: true,
        degraded_reason: "related_profiles_unavailable",
        consistency: "eventual",
      });
    }
    return json(res, 200, {
      pubkey: pk,
      related_profiles: [mentionProfile],
      consistency: "eventual",
    });
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
    const profiles = [authorProfile, mentionProfile, ...threadProfiles].filter((profile) =>
      pubkeys.length === 0 ? true : pubkeys.includes(profile.pubkey)
    );
    return json(res, 200, { profiles });
  }

  if (path === "/api/v1/events/batch") {
    const body = (await readBody(req)) ?? {};
    const ids = Array.isArray(body.ids) ? body.ids : [];
    const events = [focalNote, quotedEvent, replyA, replyB, replyC, replyD].filter((event) =>
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
    const parts = path.split("/").filter(Boolean);
    const pk = parts[3] ?? "";
    if (pk === UNKNOWN_PK) {
      return json(res, 404, { error: { code: "not_found", message: "profile not found" } });
    }
    if (pk === DEGRADED_RELATED_PK) {
      return json(res, 200, {
        pubkey: pk,
        profile: degradedSubjectProfile,
        hero: {
          display_name: degradedSubjectProfile.display_name,
          handle: degradedSubjectProfile.name,
          bio: degradedSubjectProfile.about,
          counters: { note_count: 0, follower_count: 2 },
        },
        stats: { note_count: 0, follower_count: 2, reply_count: 0 },
        recent_note_previews: [],
        // Empty here forces the page onto the /related endpoint, which is degraded.
        related_discovery: { related_profiles: [], rising_profiles: [] },
        consistency: "eventual",
      });
    }
    return json(res, 200, {
      pubkey: AUTHOR_PK,
      profile: authorProfile,
      hero: {
        display_name: authorProfile.display_name,
        handle: authorProfile.nip05,
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
          {
            key: "metadata_created_at",
            label: "Metadata created at",
            value: { raw: "1789138347", display: "1789138347", copyable: false },
          },
        ],
      },
      stats: {
        note_count: 3,
        follower_count: 10,
        reply_count: 0,
        recent_activity_at: Math.floor(Date.now() / 1000) - 5 * 3600,
      },
      trust_summary: { tier: "seed", hop_distance: 0, percentile: 0.0012 },
      metadata_event_id: "67a59200716c385cd43c84dbbc5ebed783844ca56625787fdbf586bfc471ee67",
      metadata_created_at: 1789138347,
      recent_note_previews: trendingNotes,
      related_discovery: {
        related_profiles: [
          {
            ...mentionProfile,
            reasons: ["interaction_adjacency", "reply_adjacency"],
            interaction_adjacency: 6,
            reply_adjacency: 5,
          },
        ],
        rising_profiles: [mentionProfile],
      },
      consistency: "eventual",
    });
  }

  if (path.startsWith("/api/v1/profiles/") || path.startsWith("/api/v1/users/")) {
    const parts = path.split("/").filter(Boolean);
    if ((parts[3] ?? "") === UNKNOWN_PK) {
      return json(res, 404, { error: { code: "not_found", message: "profile not found" } });
    }
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
    const isFocal = id === FOCAL_ID;
    if (path.endsWith("/ancestors")) {
      // The nested reply has the focal note and the first reply above it.
      const ancestors = id === REPLY_B_ID ? [focalNote, replyA] : [];
      return json(res, 200, { ancestors, missing_ancestor_ids: [] });
    }
    if (path.endsWith("/replies")) {
      if (!isFocal) return json(res, 200, { replies: [] });
      const cursor = url.searchParams.get("cursor");
      if (cursor === REPLIES_CURSOR_2) {
        return json(res, 200, { replies: [replyC], consistency: "eventual" });
      }
      return json(res, 200, {
        replies: [
          replyA,
          replyB,
          replyD,
          duplicateReply(DUP_1_ID, 1_700_000_300),
          duplicateReply(DUP_2_ID, 1_700_000_310),
        ],
        next_cursor: REPLIES_CURSOR_2,
        consistency: "eventual",
      });
    }
    if (path.endsWith("/related")) {
      if (!isFocal) return json(res, 200, { related: [] });
      return json(res, 200, { event_id: FOCAL_ID, related: [relatedRepostOfFocal] });
    }
    if (path.endsWith("/seen-on")) {
      return json(res, 200, { seen_on: [{ relay: "wss://relay.example.com" }] });
    }
    if (path.endsWith("/counts")) {
      return json(res, 200, {
        counts: { reply_count: isFocal ? 5 : 2, reaction_count: 5 },
      });
    }
    if (path.endsWith("/activity")) {
      if (!isFocal) return json(res, 200, { activity: [] });
      return json(res, 200, { root_event_id: FOCAL_ID, activity: [repostOfOther, replyA] });
    }
    return json(res, 200, notePayload(id));
  }

  return json(res, 200, {});
});

server.listen(port, "127.0.0.1", () => {
  console.log(`[mock-api] listening on http://127.0.0.1:${port}`);
});
