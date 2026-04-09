export type RouteSearchParams = Record<string, string | string[] | undefined>;

export function readSearchParam(params: RouteSearchParams, key: string): string | undefined {
  const value = params[key];
  if (typeof value === "string" && value.length > 0) return value;
  if (Array.isArray(value)) {
    const first = value.find((entry) => typeof entry === "string" && entry.length > 0);
    return first;
  }
  return undefined;
}

export function toUrlSearchParams(params: RouteSearchParams): URLSearchParams {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string" && value.length > 0) {
      searchParams.set(key, value);
      continue;
    }
    if (Array.isArray(value)) {
      for (const entry of value) {
        if (typeof entry === "string" && entry.length > 0) {
          searchParams.append(key, entry);
        }
      }
    }
  }
  return searchParams;
}

export function buildContinuationHref(
  route: string,
  current: URLSearchParams,
  key: string,
  value?: string
): string {
  const next = new URLSearchParams(current);
  if (value && value.length > 0) {
    next.set(key, value);
  } else {
    next.delete(key);
  }
  const query = next.toString();
  return query.length > 0 ? `${route}?${query}` : route;
}
