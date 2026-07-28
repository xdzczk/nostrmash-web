function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

export type RssItem = {
  title: string;
  link: string;
  description: string;
  pubDate?: Date;
  guid?: string;
};

export function buildRssXml(input: {
  title: string;
  link: string;
  description: string;
  items: RssItem[];
}): string {
  const items = input.items
    .map((item) => {
      const pubDate = item.pubDate ? item.pubDate.toUTCString() : undefined;
      return [
        "<item>",
        `<title>${escapeXml(item.title)}</title>`,
        `<link>${escapeXml(item.link)}</link>`,
        `<guid isPermaLink="true">${escapeXml(item.guid ?? item.link)}</guid>`,
        `<description>${escapeXml(item.description)}</description>`,
        pubDate ? `<pubDate>${escapeXml(pubDate)}</pubDate>` : "",
        "</item>",
      ]
        .filter(Boolean)
        .join("");
    })
    .join("");

  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<rss version="2.0">`,
    `<channel>`,
    `<title>${escapeXml(input.title)}</title>`,
    `<link>${escapeXml(input.link)}</link>`,
    `<description>${escapeXml(input.description)}</description>`,
    items,
    `</channel>`,
    `</rss>`,
  ].join("");
}
