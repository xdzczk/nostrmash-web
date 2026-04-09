import { isRecord } from "@/components/explorer/utils";

export function classifyStats(value: unknown): {
  primitives: Array<{ label: string; value: string | number | boolean }>;
  objects: Array<{ label: string; value: Record<string, unknown> }>;
  arrays: Array<{ label: string; value: unknown[] }>;
  leftovers: Array<{ label: string; value: unknown }>;
} {
  const primitives: Array<{ label: string; value: string | number | boolean }> = [];
  const objects: Array<{ label: string; value: Record<string, unknown> }> = [];
  const arrays: Array<{ label: string; value: unknown[] }> = [];
  const leftovers: Array<{ label: string; value: unknown }> = [];

  if (!isRecord(value)) {
    return { primitives, objects, arrays, leftovers };
  }

  for (const [label, entry] of Object.entries(value)) {
    if (typeof entry === "string" || typeof entry === "number" || typeof entry === "boolean") {
      primitives.push({ label, value: entry });
      continue;
    }
    if (Array.isArray(entry)) {
      arrays.push({ label, value: entry });
      continue;
    }
    if (isRecord(entry)) {
      objects.push({ label, value: entry });
      continue;
    }
    leftovers.push({ label, value: entry });
  }

  return { primitives, objects, arrays, leftovers };
}

export function pickRelayEntryByHost(payload: unknown, relayHost: string): unknown {
  const target = relayHost.toLowerCase();
  const { arrays } = classifyStats(payload);
  for (const group of arrays) {
    for (const row of group.value) {
      if (!isRecord(row)) continue;
      for (const key of ["relay_url", "url", "host", "relay", "name"]) {
        const value = row[key];
        if (typeof value === "string" && value.toLowerCase().includes(target)) {
          return row;
        }
      }
    }
  }
  return null;
}

export interface RelayRowSummary {
  relay: string;
  metrics: Record<string, string | number | boolean>;
}

export function extractRelayRows(payload: unknown, limit = 20): RelayRowSummary[] {
  const { arrays } = classifyStats(payload);
  const rows: RelayRowSummary[] = [];

  for (const group of arrays) {
    for (const row of group.value) {
      if (!isRecord(row)) continue;
      const relay =
        (["relay_url", "url", "host", "relay", "name"]
          .map((key) => row[key])
          .find((value) => typeof value === "string" && value.trim().length > 0) as
          | string
          | undefined) ?? "";
      if (!relay) continue;

      const metrics = Object.fromEntries(
        Object.entries(row).filter(
          ([key, value]) =>
            key !== "relay_url" &&
            key !== "url" &&
            key !== "host" &&
            key !== "relay" &&
            key !== "name" &&
            (typeof value === "string" || typeof value === "number" || typeof value === "boolean")
        )
      ) as Record<string, string | number | boolean>;

      rows.push({ relay, metrics });
      if (rows.length >= limit) {
        return rows;
      }
    }
  }

  return rows;
}

export function pickTopPrimitiveStats(
  payload: unknown,
  preferredKeys: string[],
  limit = 6
): Array<{ label: string; value: string | number | boolean }> {
  const { primitives } = classifyStats(payload);
  if (primitives.length === 0) return [];

  const byKey = new Map(primitives.map((entry) => [entry.label, entry]));
  const selected: Array<{ label: string; value: string | number | boolean }> = [];
  const seen = new Set<string>();

  for (const key of preferredKeys) {
    const stat = byKey.get(key);
    if (!stat) continue;
    selected.push(stat);
    seen.add(key);
    if (selected.length >= limit) return selected;
  }

  for (const stat of primitives) {
    if (seen.has(stat.label)) continue;
    selected.push(stat);
    if (selected.length >= limit) break;
  }

  return selected;
}
