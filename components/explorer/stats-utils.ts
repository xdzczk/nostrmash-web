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
