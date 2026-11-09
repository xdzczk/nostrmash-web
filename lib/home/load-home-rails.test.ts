import { describe, expect, it } from "vitest";

import { featuredArticle } from "@/lib/home/load-home-rails";
import { LONG_FORM_KIND, type EventRecord } from "@/lib/types/api";

function article(id: string, image?: string): EventRecord {
  return {
    id,
    kind: LONG_FORM_KIND,
    pubkey: "b".repeat(64),
    content: "Body.",
    tags: image
      ? [
          ["title", id],
          ["image", image],
        ]
      : [["title", id]],
  };
}

describe("featuredArticle", () => {
  it("keeps the leader when that article has a cover", () => {
    const leader = article("a".repeat(64), "https://cdn.example/a.jpg");
    const next = article("c".repeat(64), "https://cdn.example/c.jpg");
    expect(featuredArticle([leader, next])?.id).toBe(leader.id);
  });

  it("uses the next ranked article when the leader has no cover", () => {
    const leader = article("a".repeat(64));
    const covered = article("c".repeat(64), "https://cdn.example/c.jpg");
    expect(featuredArticle([leader, covered])?.id).toBe(covered.id);
  });

  it("keeps a coverless leader when nothing else has a cover", () => {
    const leader = article("a".repeat(64));
    expect(featuredArticle([leader])?.id).toBe(leader.id);
    expect(featuredArticle([])).toBeUndefined();
  });
});
