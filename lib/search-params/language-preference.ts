import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import type { RouteSearchParams } from "@/lib/search-params/pagination";
import { LANGUAGE_COOKIE, resolveLanguagePreference } from "@/lib/search-params/language";

/**
 * Shared Discover entry point. Reads `lang`, otherwise redirects to the same
 * URL with the `nm_lang` cookie applied. Choosing "All languages" clears the
 * cookie in the selector before navigating back to a URL without `lang`.
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
