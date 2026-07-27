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

const server = http.createServer((req, res) => {
  const url = new URL(req.url ?? "/", `http://127.0.0.1:${port}`);
  const path = url.pathname;

  if (path === "/api/v1/discovery/home") {
    return json(res, 200, {
      notes: [],
      profiles: [],
      hashtags: [],
      domains: [],
      consistency: "eventual",
    });
  }

  if (path.startsWith("/api/v1/search")) {
    return json(res, 200, {
      notes: [],
      profiles: [],
      hashtags: [],
      relays: [],
    });
  }

  if (path.startsWith("/api/v1/discovery/")) {
    return json(res, 200, {
      notes: [],
      profiles: [],
      hashtags: [],
      domains: [],
      articles: [],
      next_cursor: undefined,
    });
  }

  if (path.startsWith("/api/v1/relays") || path.includes("/stats/")) {
    return json(res, 200, { relays: [] });
  }

  if (path.startsWith("/api/v1/profiles/") || path.startsWith("/api/v1/users/")) {
    return json(res, 200, {
      pubkey: "e".repeat(64),
      profile: {
        pubkey: "e".repeat(64),
        display_name: "Mock Profile",
      },
      recent_note_previews: [],
      related_discovery: { related_profiles: [], rising_profiles: [] },
    });
  }

  if (path.startsWith("/api/v1/authors/")) {
    return json(res, 200, { events: [], replies: [], reactions: [], zaps: [] });
  }

  if (
    path.startsWith("/api/v1/notes/") ||
    path.startsWith("/api/v1/events/") ||
    path.startsWith("/api/v1/threads/")
  ) {
    const id = "a".repeat(64);
    return json(res, 200, {
      note: {
        id,
        pubkey: "b".repeat(64),
        kind: 1,
        created_at: 1_700_000_000,
        content: "Mock note content",
      },
      event: {
        id,
        pubkey: "b".repeat(64),
        kind: 1,
        created_at: 1_700_000_000,
        content: "Mock note content",
      },
      root: {
        id,
        pubkey: "b".repeat(64),
        kind: 1,
        created_at: 1_700_000_000,
        content: "Mock note content",
      },
      ancestors: [],
      replies: [],
      counts: {},
      seen_on: [],
    });
  }

  return json(res, 200, {});
});

server.listen(port, "127.0.0.1", () => {
  console.log(`[mock-api] listening on http://127.0.0.1:${port}`);
});
