/** Scheme, path, and trailing slash removed. Comparison is case-insensitive. */
export function bareHost(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  const withoutScheme = trimmed.replace(/^[a-z][a-z0-9+.-]*:\/\//i, "");
  const host = withoutScheme.split(/[/?#]/)[0] ?? "";
  return host.replace(/\.+$/, "").toLowerCase();
}

export function mergeHostCounts(
  rows: Array<{ host: string; count: number }>
): Array<{ host: string; count: number }> {
  const totals = new Map<string, number>();
  for (const row of rows) {
    const host = bareHost(row.host);
    if (!host) continue;
    totals.set(host, (totals.get(host) ?? 0) + row.count);
  }
  return [...totals.entries()]
    .map(([host, count]) => ({ host, count }))
    .sort((left, right) => right.count - left.count || left.host.localeCompare(right.host));
}
