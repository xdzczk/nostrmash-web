import { permanentRedirect } from "next/navigation";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function TrendingRedirect({ searchParams }: { searchParams: SearchParams }) {
  const resolved = await searchParams;
  const candidate = Array.isArray(resolved.window) ? resolved.window[0] : resolved.window;
  const query = candidate === "7d" || candidate === "24h" ? `?window=${candidate}` : "";

  permanentRedirect(`/${query}`);
}
