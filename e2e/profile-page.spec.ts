import { expect, test } from "@playwright/test";

const AUTHOR_PK = "b".repeat(64);
const DEGRADED_RELATED_PK = "e".repeat(64);

test.describe("profile page", () => {
  test("hero shows formatted handle, trust badge, recency, custom fields and a cropped cover", async ({
    page,
  }) => {
    await page.goto(`/profiles/${AUTHOR_PK}`);

    const hero = page.locator("section").first();
    await expect(hero.getByRole("heading", { level: 1, name: "Mock Author" })).toBeVisible();
    await expect(hero.getByText("Profile intelligence")).toHaveCount(0);
    // `_@domain` NIP-05 renders as the bare domain.
    await expect(hero.getByText("mockauthor.example", { exact: true })).toBeVisible();
    await expect(hero.getByText("_@mockauthor.example")).toHaveCount(0);

    const signals = page.getByTestId("profile-hero-signals");
    const trust = signals.getByRole("link", { name: /Trust.*Seed · top 0\.1%/ });
    await expect(trust).toBeVisible();
    await expect(trust).toHaveAttribute("href", "/methodology#trust");
    await expect(signals.getByText("Active 5h ago")).toBeVisible();
    await expect(signals.getByRole("link", { name: "github.com/mockauthor" })).toHaveAttribute(
      "href",
      "https://github.com/mockauthor"
    );

    const cover = page.getByTestId("profile-cover");
    await expect(cover).toBeAttached();
    await expect(cover).toHaveAttribute("aria-hidden", "true");

    const openMenu = page.getByTestId("entity-actions-menu");
    await openMenu.locator("summary").click();
    await expect(openMenu.getByRole("link", { name: "Open in client" })).toBeVisible();
    await expect(openMenu.getByRole("link", { name: "njump.me" })).toBeVisible();
    await expect(openMenu.getByRole("link", { name: "Damus" })).toBeVisible();
    await expect(openMenu.getByRole("link", { name: "Amethyst" })).toBeVisible();
    await expect(openMenu.getByRole("button", { name: "Copy npub" })).toBeVisible();
    await expect(openMenu.getByRole("button", { name: "Copy nostr: link" })).toBeVisible();
    await expect(openMenu.getByRole("button", { name: "Share" })).toBeVisible();

    // Context nav is compact: only the back link, no breadcrumb trail.
    const contextNav = page.getByRole("navigation", { name: "Discovery context" });
    await expect(contextNav.getByRole("link", { name: /Back to People/ })).toBeVisible();
    await expect(contextNav.getByRole("link", { name: "Methodology" })).toHaveCount(0);
  });

  test("related discovery explains why each profile is related", async ({ page }) => {
    await page.goto(`/profiles/${AUTHOR_PK}`);
    const related = page.locator("#related-profiles");
    const activity = page.locator("#profile-activity");
    await expect(activity.getByRole("heading", { name: "Recent activity" })).toBeVisible();
    await expect(related.getByRole("heading", { name: "Related discovery" })).toBeVisible();
    const activityBox = await activity.boundingBox();
    const relatedBox = await related.boundingBox();
    expect(activityBox).not.toBeNull();
    expect(relatedBox).not.toBeNull();
    expect(activityBox!.y).toBeLessThan(relatedBox!.y);
    await expect(related.getByTestId("profile-related-rail")).toBeVisible();
    await expect(related.locator("p", { hasText: /^Related profiles$/ })).toBeVisible();
    await expect(related.getByText("6 interactions · 5 replies")).toBeVisible();
    await expect(related.getByText("Fallback", { exact: true })).toHaveCount(0);
  });

  test("degraded related list is labelled as trending fallback and drops the subject", async ({
    page,
  }) => {
    await page.goto(`/profiles/${DEGRADED_RELATED_PK}`);
    const related = page.locator("#related-profiles");
    await expect(
      related.getByText(
        "Related profiles are unavailable right now; showing trending profiles instead."
      )
    ).toBeVisible();
    await expect(related.getByText("Fallback", { exact: true })).toBeVisible();
    await expect(related.locator("p", { hasText: /^Trending profiles$/ })).toBeVisible();
    // The subject itself ("Lonely Account") is filtered out of its own list.
    await expect(related.getByRole("link", { name: /Lonely Account/ })).toHaveCount(0);
    await expect(related.getByText("Mock Author").first()).toBeVisible();
    await expect(page.getByTestId("profile-cover")).toHaveCount(0);
  });

  test("activity tabs switch in place without scrolling, with secondary tabs under More", async ({
    page,
  }) => {
    await page.goto(`/profiles/${AUTHOR_PK}`);
    const tabs = page.getByRole("navigation", { name: "Profile activity" });
    await expect(tabs.getByRole("link", { name: "Notes", exact: true })).toHaveAttribute(
      "aria-current",
      "page"
    );
    // Secondary tabs are folded away.
    await expect(tabs.getByRole("link", { name: "Highlights" })).toBeHidden();
    await expect(tabs.getByText("More")).toBeVisible();

    await expect(page.getByTestId("profile-related-rail")).toBeVisible();
    await page.locator("#profile-activity").evaluate((el) => {
      const header = document.querySelector("header");
      const headerBottom = header?.getBoundingClientRect().bottom ?? 0;
      const top = el.getBoundingClientRect().top + window.scrollY - headerBottom - 12;
      window.scrollTo(0, Math.max(0, top));
    });
    const before = await page.evaluate(() => window.scrollY);
    expect(before).toBeGreaterThan(0);

    await tabs.getByRole("link", { name: "Replies", exact: true }).click();
    await expect(page).toHaveURL(/activity=replies/);
    await expect(tabs.getByRole("link", { name: "Replies", exact: true })).toHaveAttribute(
      "aria-current",
      "page"
    );
    const after = await page.evaluate(() => window.scrollY);
    expect(Math.abs(after - before)).toBeLessThan(16);

    const panel = page.getByTestId("profile-activity-panel");
    await expect(panel.getByText("Thanks for the note")).toBeVisible();
    await expect(panel.getByRole("link", { name: /Hello/ })).toBeVisible();

    // Open the More menu and choose a secondary tab.
    await tabs.getByText("More").click();
    await tabs.getByRole("menuitem", { name: "Highlights" }).click();
    await expect(page).toHaveURL(/activity=highlights/);
    await expect(page.getByTestId("tab-overflow-menu").locator("summary")).toContainText(
      "Highlights"
    );
    await expect(page.getByTestId("tab-overflow-menu")).not.toHaveAttribute("open", "");
    await expect(panel.getByText(/passages the account clipped/)).toBeVisible();
  });

  test("an unknown profile renders the not-found empty state", async ({ page }) => {
    const response = await page.goto("/profiles/not-a-real-key");
    expect(response?.status()).toBe(404);
    await expect(page.getByText("Page not found")).toBeVisible();
    await expect(page.getByText(/The signal ends here/)).toBeVisible();
  });
});
