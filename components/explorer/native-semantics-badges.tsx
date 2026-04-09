import { ConsistencyBadge } from "@/components/explorer/consistency-badge";
import { isRecord } from "@/components/explorer/utils";
import type { NativeApiSemantics } from "@/lib/types/api";

function formatScopeValue(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function formatResultScope(resultScope: NativeApiSemantics["result_scope"]): string | undefined {
  if (typeof resultScope === "string" && resultScope.trim().length > 0) {
    return resultScope.trim();
  }
  if (!isRecord(resultScope)) return undefined;
  const entries = Object.entries(resultScope).slice(0, 3);
  if (entries.length === 0) return undefined;
  return entries.map(([key, value]) => `${key}: ${formatScopeValue(value)}`).join(" • ");
}

export function NativeSemanticsBadges({
  semantics,
}: {
  semantics:
    | Pick<NativeApiSemantics, "consistency" | "trust_mode" | "trust_applied" | "result_scope">
    | null
    | undefined;
}) {
  if (!semantics) return null;
  const consistency =
    typeof semantics.consistency === "string" && semantics.consistency.length > 0
      ? semantics.consistency
      : undefined;
  const trustMode =
    typeof semantics.trust_mode === "string" && semantics.trust_mode.length > 0
      ? semantics.trust_mode
      : undefined;
  const trustApplied =
    typeof semantics.trust_applied === "boolean" ? semantics.trust_applied : undefined;
  const resultScopeText = formatResultScope(semantics.result_scope);

  if (!consistency && !trustMode && trustApplied === undefined && !resultScopeText) {
    return null;
  }

  return (
    <>
      <ConsistencyBadge consistency={consistency} />
      {trustMode ? (
        <span className="rounded-full border border-zinc-700 px-2 py-1 text-zinc-300">
          trust mode: {trustMode}
        </span>
      ) : null}
      {trustApplied !== undefined ? (
        <span className="rounded-full border border-zinc-700 px-2 py-1 text-zinc-300">
          trust applied: {trustApplied ? "yes" : "no"}
        </span>
      ) : null}
      {resultScopeText ? (
        <span className="max-w-full rounded-full border border-zinc-700 px-2 py-1 break-words text-zinc-300">
          scope: {resultScopeText}
        </span>
      ) : null}
    </>
  );
}
