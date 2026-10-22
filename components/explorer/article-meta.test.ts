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

  it("decodes entities before markdown stripping and does not repeat a derived title", () => {
    const presentation = getArticlePresentation({
      id: "e".repeat(64),
      kind: LONG_FORM_KIND,
      pubkey: "b".repeat(64),
      content:
        "This article was originally published via my Substack:&#x20;https://frankcorva.substack.com/p/this and then it continues with enough further sentences to remain a summary.",
    });
    expect(presentation.title).not.toMatch(/&|x20/);
    expect(presentation.title.toLowerCase()).toContain("substack");
    expect(presentation.summary ?? "").not.toMatch(/^this article was originally/i);
    expect(presentation.summary ?? "").not.toMatch(/&#x20;|& x20;/);
  });

  it("keeps hyphens inside an explicit title", () => {
    const presentation = getArticlePresentation({
      id: "f".repeat(64),
      kind: LONG_FORM_KIND,
      pubkey: "b".repeat(64),
      content: "Body.",
      tags: [["title", "Why long-form matters"]],
    });
    expect(presentation.title).toBe("Why long-form matters");
  });

  it("drops pipe tables so a table-only body has no pipe summary and no read time", () => {
    const presentation = getArticlePresentation({
      id: "d".repeat(64),
      kind: LONG_FORM_KIND,
      pubkey: "b".repeat(64),
      content: "| Imagine | IF |\n| --- | --- |\n| 2026 |  |\n",
      tags: [["title", "Imagine IF 2026"]],
    });
    expect(presentation.title).toBe("Imagine IF 2026");
    expect(presentation.summary ?? "").not.toMatch(/\|/);
    expect(presentation.summary).toBeUndefined();
    expect(presentation.readingMinutes).toBeUndefined();
    expect(presentation.readingMinutes).not.toBe(0);
  });
});

describe("isLongFormEvent", () => {
  it("detects kind 30023", () => {
    expect(isLongFormEvent(ARTICLE)).toBe(true);
    expect(isLongFormEvent({ id: "c".repeat(64), kind: 1 })).toBe(false);
  });
});
