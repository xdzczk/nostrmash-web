import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import {
  LANGUAGE_COOKIE,
  resolveRankingPreference,
  VIEWER_COOKIE,
  type RankingPreference,
} from "@/lib/search-params/ranking-decision";
import type { RouteSearchParams } from "@/lib/search-params/pagination";

export { resolveRankingPreference, type RankingPreference };

/**
 * Discover rankings that already restore `lang`. Also restores `viewer`, in
 * the same redirect, so a language hop cannot land on a shared cached URL.
 * Middleware performs the same redirect as a 307 before any document is
 * written. A 200 that named a viewer would be cacheable on `/?lang=`.
 */
export async function applyDiscoverRanking(
  path: string,
  params: RouteSearchParams
): Promise<{ language?: string; viewer?: string }> {
  const jar = await cookies();
  const decision = resolveRankingPreference(
    path,
    params,
    jar.get(LANGUAGE_COOKIE)?.value,
    jar.get(VIEWER_COOKIE)?.value
  );
  if (decision.redirectTo) redirect(decision.redirectTo);
  return { language: decision.language, viewer: decision.viewer };
}
