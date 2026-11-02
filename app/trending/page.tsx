import { permanentRedirect } from "next/navigation";

import { buildDiscoverHref, readLanguage } from "@/lib/search-params/language";
import { isStatsWindow } from "@/lib/search-params/window";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function TrendingRedirect({ searchParams }: { searchParams: SearchParams }) {
  const resolved = await searchParams;
  const candidate = Array.isArray(resolved.window) ? resolved.window[0] : resolved.window;
  const window = isStatsWindow(candidate) ? candidate : undefined;
  permanentRedirect(buildDiscoverHref("/", { window, lang: readLanguage(resolved) }));
}
