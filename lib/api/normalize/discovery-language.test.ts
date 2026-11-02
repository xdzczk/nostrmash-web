import { describe, expect, it } from "vitest";

import {
  normalizeDiscoveryHomeResponse,
  normalizeDiscoveryLanguageFields,
  normalizeTrendingLongFormResponse,
} from "@/lib/api/normalize/discovery";

describe("discovery language normalisation", () => {
  it("lifts home top_languages and keeps the echoed language", () => {
    const normalized = normalizeDiscoveryHomeResponse({
      language: "de",
      window: "24h",
      sections: {
        network_summary: {
          top_languages: {
            "24h": [
              { language: "und", count: 10 },
              { language: "de", count: 4 },
            ],
            "7d": [{ language: "en", count: 8 }],
          },
        },
        trending_notes: [],
      },
    });

    expect(normalized.language).toBe("de");
    expect(normalized.top_languages).toEqual({
      "24h": [
        { language: "und", count: 10 },
        { language: "de", count: 4 },
      ],
      "7d": [{ language: "en", count: 8 }],
    });
  });

  it("drops an invalid language code and keeps list top_languages", () => {
    const normalized = normalizeDiscoveryLanguageFields({
      language: "english",
      notes: [],
      top_languages: { "24h": [{ language: "ja", count: 3 }] },
    });
    expect(normalized.language).toBeUndefined();
    expect(normalized.top_languages).toEqual({ "24h": [{ language: "ja", count: 3 }] });
  });

  it("keeps language fields on long-form payloads", () => {
    const normalized = normalizeTrendingLongFormResponse({
      language: "ja",
      window: "7d",
      articles: [],
      top_languages: { "7d": [{ language: "ja", count: 2 }] },
    });
    expect(normalized.language).toBe("ja");
    expect(normalized.top_languages?.["7d"]).toEqual([{ language: "ja", count: 2 }]);
  });

  it("keeps the 30d language bucket and reads that domain trend window", () => {
    const normalized = normalizeDiscoveryHomeResponse({
      window: "30d",
      sections: {
        network_summary: {
          top_languages: {
            "24h": [{ language: "en", count: 1 }],
            "30d": [{ language: "de", count: 9 }],
          },
          top_hashtags: {
            "30d": [{ hashtag: "nostr", count: 4 }],
          },
        },
        trending_domains: [
          {
            domain: "youtube.com",
            link_count: 1,
            note_count: 1,
            trend_windows: {
              "24h": { link_count: 10, note_count: 8 },
              "30d": { link_count: 90, note_count: 70, unique_authors: 12 },
            },
          },
        ],
      },
    });

    expect(normalized.top_languages?.["30d"]).toEqual([{ language: "de", count: 9 }]);
    expect(normalized.hashtags?.[0]).toMatchObject({ hashtag: "nostr", count: 4 });
    expect(normalized.domains?.[0]).toMatchObject({
      domain: "youtube.com",
      link_count: 90,
      note_count: 70,
      event_count: 70,
      unique_authors: 12,
    });
  });
});
