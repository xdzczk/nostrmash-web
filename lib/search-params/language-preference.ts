import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import type { RouteSearchParams } from "@/lib/search-params/pagination";
import { LANGUAGE_COOKIE, resolveLanguagePreference } from "@/lib/search-params/language";

/**
 * Shared Discover entry point. An explicit `lang` wins. `lang=all` drops the
 * param. Otherwise a saved `nm_lang` language is written onto the URL.
 * The visitor's Accept-Language header is ignored.
 */
export async function applyDiscoverLanguage(
  path: string,
  params: RouteSearchParams
): Promise<string | undefined> {
  const jar = await cookies();
  const decision = resolveLanguagePreference(path, params, jar.get(LANGUAGE_COOKIE)?.value);
  if (decision.redirectTo) redirect(decision.redirectTo);
  return decision.language;
}
