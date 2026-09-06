import { describe, expect, it } from "vitest";

import { getArticlePresentation, isLongFormEvent } from "@/components/explorer/article-meta";
import { LONG_FORM_KIND } from "@/lib/types/api";

const ARTICLE = {
  id: "a".repeat(64),
  kind: LONG_FORM_KIND,
  pubkey: "b".repeat(64),
  content: `# Hello\n\nThis is the full article body with enough words to stay intact.\n\n${"More text. ".repeat(40)}`,
  tags: [
    ["title", "A complete title"],
    ["summary", "A short dek"],
    ["t", "bitcoin"],
    ["t", "nostr"],
    ["image", "https://cdn.example/hero.jpg"],
  ],
};

describe("getArticlePresentation", () => {
  it("keeps the full markdown body and a clamped summary for cards", () => {
    const presentation = getArticlePresentation(ARTICLE);
    expect(presentation.title).toBe("A complete title");
    expect(presentation.summary).toBe("A short dek");
    expect(presentation.body).toBe(ARTICLE.content);
    expect(presentation.body.includes("full article body")).toBe(true);
    expect(presentation.hashtags).toEqual(["bitcoin", "nostr"]);
    expect(presentation.image).toBe("https://cdn.example/hero.jpg");
  });

  it("does not clamp the body when the markdown is long", () => {
    const presentation = getArticlePresentation(ARTICLE);
    expect(presentation.body.length).toBe(ARTICLE.content.length);
  });
});

describe("isLongFormEvent", () => {
  it("detects kind 30023", () => {
    expect(isLongFormEvent(ARTICLE)).toBe(true);
    expect(isLongFormEvent({ id: "c".repeat(64), kind: 1 })).toBe(false);
  });
});
