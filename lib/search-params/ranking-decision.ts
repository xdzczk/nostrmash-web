import { LANGUAGE_COOKIE, resolveLanguagePreference } from "@/lib/search-params/language";
import { toUrlSearchParams, type RouteSearchParams } from "@/lib/search-params/pagination";
import { VIEWER_COOKIE, resolveViewerPreference } from "@/lib/search-params/viewer";

export { LANGUAGE_COOKIE, VIEWER_COOKIE };

export type RankingPreference = {
  language?: string;
  viewer?: string;
  redirectTo?: string;
};

function queryFromRedirect(redirectTo: string): URLSearchParams {
  const index = redirectTo.indexOf("?");
  if (index < 0) return new URLSearchParams();
  return new URLSearchParams(redirectTo.slice(index + 1));
}

/**
 * Language and viewer redirects in one hop. Each rule is unchanged: an
 * explicit param wins, and a saved cookie is copied onto the URL. Search and
 * other non-ranking routes do not use this.
 */
export function resolveRankingPreference(
  path: string,
  params: RouteSearchParams,
  langCookie: string | undefined,
  viewerCookie: string | undefined
): RankingPreference {
  const language = resolveLanguagePreference(path, params, langCookie);
  const viewer = resolveViewerPreference(path, params, viewerCookie);
  if (!language.redirectTo && !viewer.redirectTo) {
    return { language: language.language, viewer: viewer.viewer };
  }

  const next = language.redirectTo
    ? queryFromRedirect(language.redirectTo)
    : toUrlSearchParams(params);
  if (viewer.redirectTo) {
    const viewerValue = queryFromRedirect(viewer.redirectTo).get("viewer");
    if (viewerValue) next.set("viewer", viewerValue);
  }
  const query = next.toString();
  return { redirectTo: query.length > 0 ? `${path}?${query}` : path };
}
