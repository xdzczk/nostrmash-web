import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import type { RouteSearchParams } from "@/lib/search-params/pagination";
import { VIEWER_COOKIE, resolveViewerPreference } from "@/lib/search-params/viewer";

/**
 * Ranking pages only. An explicit `viewer` wins. Otherwise a saved `nm_viewer`
 * key is written onto the URL. The cookie is not read to render a bare URL.
 */
export async function applyDiscoverViewer(
  path: string,
  params: RouteSearchParams
): Promise<string | undefined> {
  const jar = await cookies();
  const decision = resolveViewerPreference(path, params, jar.get(VIEWER_COOKIE)?.value);
  if (decision.redirectTo) redirect(decision.redirectTo);
  return decision.viewer;
}
