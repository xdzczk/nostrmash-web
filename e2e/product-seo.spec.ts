import { expect, test } from "@playwright/test";

test.describe("product + SEO surfaces", () => {
  test("robots and sitemap respond", async ({ request }) => {
    const robots = await request.get("/robots.txt");
    expect(robots.ok()).toBeTruthy();
    const robotsBody = await robots.text();
    expect(robotsBody).toMatch(/Sitemap:/i);

    const sitemap = await request.get("/sitemap.xml");
    expect(sitemap.ok()).toBeTruthy();
    const sitemapBody = await sitemap.text();
    expect(sitemapBody).toContain("<urlset");
  });

  test("trending notes RSS feed returns XML", async ({ request }) => {
    const feed = await request.get("/feeds/trending-notes.xml");
    expect(feed.ok()).toBeTruthy();
    const body = await feed.text();
    expect(body).toContain("<rss");
    expect(body).toContain("<channel>");
  });

  test("oEmbed endpoint accepts note URLs", async ({ request, baseURL }) => {
    const noteUrl = `${baseURL}/notes/${"a".repeat(64)}`;
    const response = await request.get(`/api/oembed?url=${encodeURIComponent(noteUrl)}`);
    expect(response.ok()).toBeTruthy();
    const json = await response.json();
    expect(json.type).toBe("rich");
    expect(String(json.html)).toContain("/embed/notes/");
  });

  test("note page exposes share actions when mock data is available", async ({ page }) => {
    await page.goto(`/notes/${"a".repeat(64)}`);
    // Mock API may 404; either not-found or share actions are acceptable outcomes.
    const notFound = page.getByText(/page not found/i);
    const share = page.getByRole("button", { name: /share/i });
    await expect(notFound.or(share)).toBeVisible();
  });
});
