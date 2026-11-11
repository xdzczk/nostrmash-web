/**
 * Rankings whose URL is the cache key. A cookie-only personalization would
 * publish one viewer's document. Middleware redirects those cookies onto the
 * query string with a 307, so the edge cache (which stores 200s) never keeps
 * a body that names a viewer.
 */
export const RANKING_PATHS = new Set([
  "/",
  "/trending",
  "/trending/notes",
  "/trending/long-form",
  "/trending/profiles",
  "/trending/hashtags",
  "/trending/domains",
  "/trending/pictures",
  "/trending/videos",
  "/trending/shorts",
  "/discovery/conversations/hot",
  "/discovery/notes/bookmarked",
  "/discovery/notes/zapped",
  "/discovery/profiles/followed",
  "/discovery/profiles/rising",
  "/discovery/profiles/supported",
]);

/** Followed and supported ignore `lang`. Do not start writing it onto them. */
export const VIEWER_ONLY_PATHS = new Set([
  "/discovery/profiles/followed",
  "/discovery/profiles/supported",
]);
