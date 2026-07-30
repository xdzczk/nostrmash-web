import type { NativeApiSemantics } from "@/lib/types/api";

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function asRecord(value: unknown): Record<string, unknown> | null {
  return isRecord(value) ? value : null;
}

export function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

export function asNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

export function asBoolean(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

export function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

export function parseJsonRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== "string") return null;
  try {
    const parsed = JSON.parse(value);
    return asRecord(parsed);
  } catch {
    return null;
  }
}

export function firstString(...values: unknown[]): string | undefined {
  for (const value of values) {
    const candidate = asString(value);
    if (candidate) return candidate;
  }
  return undefined;
}

export function compactDefined<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined)) as T;
}

export const NATIVE_SEMANTIC_KEYS = [
  "consistency",
  "trust_mode",
  "trust_applied",
  "result_scope",
  "next_cursor",
  "window",
  "computed_at",
  "ranking_version",
] as const;

export const CURSOR_ALIASES = ["next_cursor", "cursor", "continuation", "next"] as const;

export function extractCursorLikeValue(value: unknown): string | undefined {
  const record = asRecord(value);
  if (!record) return undefined;
  for (const key of CURSOR_ALIASES) {
    const candidate = asString(record[key]);
    if (candidate) return candidate;
  }
  return undefined;
}

export function extractNativeApiSemantics(...values: unknown[]): NativeApiSemantics {
  const semantics: NativeApiSemantics = {};

  for (const value of values) {
    const record = asRecord(value);
    if (!record) continue;
    const meta = asRecord(record.meta);
    if (!semantics.meta && meta) {
      semantics.meta = meta as NativeApiSemantics["meta"];
    }
    for (const key of NATIVE_SEMANTIC_KEYS) {
      if (semantics[key] !== undefined) continue;
      if (record[key] !== undefined) {
        semantics[key] = record[key] as never;
        continue;
      }
      if (meta?.[key] !== undefined) {
        semantics[key] = meta[key] as never;
      }
    }
    if (!semantics.next_cursor) {
      semantics.next_cursor = extractCursorLikeValue(record) ?? extractCursorLikeValue(meta);
    }
  }

  return semantics;
}

export function parseNumericAmount(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}
