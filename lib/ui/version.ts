export type UiVersion = "v1" | "v2";

/**
 * Keep the redesign observable and reversible while page families migrate.
 * Unknown values intentionally fall forward to the current experience.
 */
export const UI_VERSION: UiVersion = process.env.NEXT_PUBLIC_UI_VERSION === "v1" ? "v1" : "v2";
