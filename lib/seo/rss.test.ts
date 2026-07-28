import { describe, expect, it } from "vitest";

import { buildRssXml } from "@/lib/seo/rss";

describe("buildRssXml", () => {
  it("escapes XML and includes items", () => {
    const xml = buildRssXml({
      title: "Feed & more",
      link: "https://example.com/",
      description: "Desc <test>",
      items: [
        {
          title: "Hello",
          link: "https://example.com/notes/1",
          description: 'A "quote"',
          pubDate: new Date("2026-01-01T00:00:00Z"),
        },
      ],
    });
    expect(xml).toContain("<title>Feed &amp; more</title>");
    expect(xml).toContain("<description>Desc &lt;test&gt;</description>");
    expect(xml).toContain("A &quot;quote&quot;");
    expect(xml).toContain("<item>");
  });
});
