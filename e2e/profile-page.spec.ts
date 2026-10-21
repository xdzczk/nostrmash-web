import { expect, test } from "@playwright/test";

const AUTHOR_PK = "b".repeat(64);
const DEGRADED_RELATED_PK = "e".repeat(64);

test.describe("profile page", () => {
  test("hero shows formatted handle, trust badge, recency, custom fields and banner backdrop", async ({
    page,
  }) => {
    await page.goto(`/profiles/${AUTHOR_PK}`);

    const hero = page.locator("section").first();
    await expect(hero.getByRole("heading", { level: 1, name: "Mock Author" })).toBeVisible();
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

    const backdrop = page.getByTestId("profile-banner-backdrop");
    await expect(backdrop).toBeAttached();
    await expect(backdrop).toHaveAttribute("aria-hidden", "true");

    // Context nav is compact: only the back link, no breadcrumb trail.
    const contextNav = page.getByRole("navigation", { name: "Discovery context" });
    await expect(contextNav.getByRole("link", { name: /Back to People/ })).toBeVisible();
    await expect(contextNav.getByRole("link", { name: "Methodology" })).toHaveCount(0);
  });

  test("related discovery explains why each profile is related", async ({ page }) => {
    await page.goto(`/profiles/${AUTHOR_PK}`);
    const related = page.locator("#related-profiles");
    await expect(related.getByRole("heading", { name: "Related discovery" })).toBeVisible();
    await expect(related.locator("p", { hasText: /^Related profiles$/ })).toBeVisible();
    await expect(related.getByText(/interacts often/)).toBeVisible();
    await expect(related.getByText(/6 interactions/)).toBeVisible();
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
  });

  test("activity tabs switch in place without scrolling, with secondary tabs under More", async ({
    page,
  }) => {
    await page.goto(`/profiles/${AUTHOR_PK}`);
    const tabs = page.getByRole("navigation", { name: "Profile activity" });
    await expect(tabs.getByRole("link", { name: "Recent notes" })).toHaveAttribute(
      "aria-current",
      "page"
    );
    // Secondary tabs are folded away.
    await expect(tabs.getByRole("link", { name: "Highlights" })).toBeHidden();
    await expect(tabs.getByText("More")).toBeVisible();

    await page.locator("#profile-activity").scrollIntoViewIfNeeded();
    const before = await page.evaluate(() => window.scrollY);
    expect(before).toBeGreaterThan(0);

    await tabs.getByRole("link", { name: "Recent replies" }).click();
    await expect(page).toHaveURL(/activity=replies/);
    await expect(tabs.getByRole("link", { name: "Recent replies" })).toHaveAttribute(
      "aria-current",
      "page"
    );
    const after = await page.evaluate(() => window.scrollY);
    expect(Math.abs(after - before)).toBeLessThan(4);

    // The empty replies panel points to a tab that has content.
    const panel = page.getByTestId("profile-activity-panel");
    await expect(panel.getByText(/No recent replies/)).toBeVisible();
    await expect(panel.getByRole("link", { name: "View recent notes" })).toBeVisible();

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
});
