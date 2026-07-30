import { expect, test } from "@playwright/test";

const FOCAL_ID = "a".repeat(64);
const AUTHOR_PK = "b".repeat(64);

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

  test("trending notes RSS feed returns items", async ({ request }) => {
    const feed = await request.get("/feeds/trending-notes.xml");
    expect(feed.ok()).toBeTruthy();
    expect(feed.headers()["content-type"] ?? "").toMatch(/rss|xml/i);
    const body = await feed.text();
    expect(body).toContain("<rss");
    expect(body).toContain("<channel>");
    expect(body).toContain("<item>");
    expect(body).toContain(`/notes/${FOCAL_ID}`);
  });

  test("oEmbed endpoint returns iframe HTML", async ({ request, baseURL }) => {
    const noteUrl = `${baseURL}/notes/${FOCAL_ID}`;
    const response = await request.get(`/api/oembed?url=${encodeURIComponent(noteUrl)}`);
    expect(response.ok()).toBeTruthy();
    const json = await response.json();
    expect(json.type).toBe("rich");
    expect(String(json.html)).toContain(`/embed/notes/${FOCAL_ID}`);
  });

  test("note page linkifies content and exposes share/OG/JSON-LD", async ({ page }) => {
    await page.goto(`/notes/${FOCAL_ID}`);

    await page.getByText("Open, share, and embed", { exact: true }).click();
    await expect(page.getByRole("button", { name: /share/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /copy nevent/i })).toBeVisible();
    await expect(page.getByRole("link", { name: "#nostr" }).first()).toHaveAttribute(
      "href",
      "/hashtags/nostr"
    );
    await expect(page.getByRole("link", { name: /example\.com/i }).first()).toBeVisible();
    await expect(page.locator('a[href*="/profiles/"]').first()).toBeVisible();

    const ogTitle = page.locator('meta[property="og:title"]');
    await expect(ogTitle).toHaveCount(1);
    await expect(page.locator('link[rel="canonical"]')).toHaveCount(1);

    const jsonLd = page.locator('script[type="application/ld+json"]');
    await expect(jsonLd.first()).toBeAttached();
    const parsed = JSON.parse((await jsonLd.first().textContent()) ?? "{}");
    expect(parsed["@type"]).toBe("SocialMediaPosting");
  });

  test("profile page exposes Person JSON-LD and actions", async ({ page }) => {
    await page.goto(`/profiles/${AUTHOR_PK}`);
    await page.getByText("Open, share, and technical identity", { exact: true }).click();
    await expect(page.getByRole("button", { name: /share/i })).toBeVisible();
    const jsonLd = page.locator('script[type="application/ld+json"]');
    await expect(jsonLd.first()).toBeAttached();
    const parsed = JSON.parse((await jsonLd.first().textContent()) ?? "{}");
    expect(parsed["@type"]).toBe("Person");
  });

  test("embed page renders note without site nav chrome", async ({ page }) => {
    await page.goto(`/embed/notes/${FOCAL_ID}`);
    await expect(page.getByText(/hello/i)).toBeVisible();
    await expect(page.getByRole("navigation")).toHaveCount(0);
  });
});
