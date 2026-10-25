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
});
