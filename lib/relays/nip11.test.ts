import { describe, expect, it } from "vitest";

import {
  chooseRelayInfoUrl,
  formatPublishedDuration,
  formatSupportedNips,
  httpUrl,
  nip11FailureMessage,
  publishedInfoRows,
  relayDocumentTitle,
  relayInfoUrlForHost,
  relayMetaDescription,
  singleLineText,
} from "@/lib/relays/nip11";
import type { Nip11Info } from "@/lib/types/api";

const pubkey = "ab".repeat(32);

const fullInfo: Nip11Info = {
  name: "Example Relay",
  description: "Public relay\nfor notes",
  icon: "https://cdn.example/icon.png",
  banner: "https://cdn.example/banner.png",
  pubkey,
  contact: "ops@example.com",
  supported_nips: [42, 1, 11, 1],
  software: "strfry",
  version: "1.0.0",
  limitation: {
    auth_required: false,
    payment_required: true,
    restricted_writes: false,
    max_message_length: 65535,
  },
  fees: {
    admission: [{ amount: 1000, unit: "msats" }],
    subscription: [{ amount: 5000, unit: "msats", period: 2_592_000 }],
    publication: [{ amount: 100, unit: "msats", kinds: [1] }],
  },
  retention: [{ kinds: [0, 1, [5, 7]], time: 3600, count: 1000 }],
};

describe("relay info URL", () => {
  it("prefers the popular row, then the probe row, then a websocket URL", () => {
    expect(
      relayInfoUrlForHost({
        host: "relay.example.com",
        popularUrls: ["wss://other.example", "wss://relay.example.com/path"],
        probeUrls: ["wss://relay.example.com/probe"],
        healthRelay: "wss://relay.example.com/health",
      })
    ).toBe("wss://relay.example.com/path");

    expect(
      chooseRelayInfoUrl({
        popularUrl: "  ",
        probeUrl: "wss://relay.example.com/",
        healthRelay: "wss://ignored.example",
        host: "relay.example.com",
      })
    ).toBe("wss://relay.example.com/");

    expect(
      chooseRelayInfoUrl({
        healthRelay: "relay.example.com",
        host: "relay.example.com",
      })
    ).toBe("wss://relay.example.com");
  });
});

describe("published relay rows", () => {
  it("renders only stated values and keeps auth false distinct from a missing field", () => {
    const rows = publishedInfoRows(fullInfo);
    const byId = Object.fromEntries(rows.map((row) => [row.id, row]));

    expect(byId.description?.text).toBe("Public relay\nfor notes");
    expect(byId.software?.text).toBe("strfry");
    expect(byId.software?.href).toBeUndefined();
    expect(byId.version?.text).toBe("1.0.0");
    expect(byId.contact?.text).toBe("ops@example.com");
    expect(byId.contact?.href).toBeUndefined();
    expect(byId.pubkey?.href).toBe(`/profiles/${pubkey}`);
    expect(byId.nips?.text).toBe("NIP-01, NIP-11, NIP-42");
    expect(byId.auth?.text).toBe("Not required");
    expect(byId.payment?.text).toBe("Required");
    expect(byId.fees?.lines).toEqual([
      `Admission · ${(1000).toLocaleString()} msats`,
      `Subscription · ${(5000).toLocaleString()} msats · ${formatPublishedDuration(2_592_000)}`,
      `Publication · ${(100).toLocaleString()} msats · kinds 1`,
    ]);
    expect(byId.retention?.lines).toEqual([
      `kinds 0, 1, 5–7 · ${formatPublishedDuration(3600)} · ${(1000).toLocaleString()} events`,
    ]);
    expect(formatPublishedDuration(2_592_000)).toBe(`${(30).toLocaleString()} days`);
    expect(rows.some((row) => row.text?.includes("65535"))).toBe(false);
    expect(rows.some((row) => /restricted/i.test(row.label))).toBe(false);
  });

  it("omits authentication when the relay did not say", () => {
    const rows = publishedInfoRows({
      limitation: { payment_required: false, max_message_length: 100 },
    });
    expect(rows.map((row) => row.id)).toEqual(["payment"]);
    expect(rows[0]?.text).toBe("Not required");
  });

  it("links software only when it is an http(s) URL", () => {
    const rows = publishedInfoRows({ software: "https://github.com/hoytech/strfry" });
    expect(rows[0]?.href).toBe("https://github.com/hoytech/strfry");
    expect(rows[0]?.external).toBe(true);
    expect(httpUrl("javascript:alert(1)")).toBeNull();
    expect(httpUrl("https://user:pass@cdn.example/icon.png")).toBeNull();
  });
});

describe("NIP-11 failure copy", () => {
  it("describes a missing document without the error code", () => {
    expect(nip11FailureMessage("http_404")).toBe("This relay does not publish a description.");
    expect(nip11FailureMessage("not_json")).toBe("This relay does not publish a description.");
    expect(nip11FailureMessage("timeout")).toBe("The relay description could not be read.");
    expect(nip11FailureMessage("connect_failed")).not.toContain("connect_failed");
    expect(nip11FailureMessage(undefined)).toBe("The relay description could not be read.");
  });
});

describe("relay metadata text", () => {
  it("keeps the host in the title and collapses the description to one line", () => {
    expect(relayDocumentTitle("relay.example.com", "Example Relay")).toBe(
      "Example Relay · relay.example.com"
    );
    expect(relayDocumentTitle("relay.example.com", "  ")).toBe("relay.example.com");
    expect(relayMetaDescription("relay.example.com")).toBe(
      "Indexed rank, listed rank, and current status for the Nostr relay relay.example.com."
    );
    expect(singleLineText("Public\n\nrelay   notes")).toBe("Public relay notes");
    const long = `word ${"detail ".repeat(40)}`;
    const line = singleLineText(long, 40);
    expect(line.endsWith("…")).toBe(true);
    expect(line.includes("\n")).toBe(false);
    expect(line.length).toBeLessThanOrEqual(40);
  });
});

describe("published durations and NIPs", () => {
  it("uses the published unit when the count is exact", () => {
    expect(formatPublishedDuration(3600)).toBe("1 hour");
    expect(formatPublishedDuration(90)).toBe("90 seconds");
    expect(formatSupportedNips([11, 1])).toBe("NIP-01, NIP-11");
    expect(formatSupportedNips([])).toBeNull();
  });
});
