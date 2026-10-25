import { permanentRedirect } from "next/navigation";

import { buildDiscoverHref, readLanguage } from "@/lib/search-params/language";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function TrendingRedirect({ searchParams }: { searchParams: SearchParams }) {
  const resolved = await searchParams;
  const candidate = Array.isArray(resolved.window) ? resolved.window[0] : resolved.window;
  const window = candidate === "7d" || candidate === "24h" ? candidate : undefined;
  permanentRedirect(buildDiscoverHref("/", { window, lang: readLanguage(resolved) }));
}
