import { extractNativeApiSemantics } from "@/lib/api/normalize";
import { toUserFacingErrorMessage } from "@/lib/errors/user-message";
import {
  buildContinuationHref,
  readSearchParam,
  toUrlSearchParams,
} from "@/lib/search-params/pagination";
import { readStatsWindow, type StatsWindow } from "@/lib/search-params/window";
import type { NativeApiSemantics } from "@/lib/types/api";

type ResolvedSearchParams = Record<string, string | string[] | undefined>;

export function hasNativeSemantics(
  semantics: Pick<
    NativeApiSemantics,
    "consistency" | "trust_mode" | "trust_applied" | "result_scope"
  > | null
): boolean {
  if (!semantics) return false;
  return (
    semantics.consistency !== undefined ||
    semantics.trust_mode !== undefined ||
    semantics.trust_applied !== undefined ||
    semantics.result_scope !== undefined
  );
}

export function readRankedListContext(
  resolvedSearchParams: ResolvedSearchParams,
  path: string
): {
  cursor: string | undefined;
  window: StatsWindow;
  currentSearchParams: URLSearchParams;
  buildCursorContinuation: (nextCursor: string | undefined) => string;
} {
  const cursor = readSearchParam(resolvedSearchParams, "cursor");
  const window = readStatsWindow(resolvedSearchParams);
  const currentSearchParams = toUrlSearchParams(resolvedSearchParams);

  return {
    cursor,
    window,
    currentSearchParams,
    buildCursorContinuation: (nextCursor) =>
      buildContinuationHref(path, currentSearchParams, "cursor", nextCursor),
  };
}

export async function loadRankedListPayload<T>(
  loader: () => Promise<T>,
  fallbackError: string
): Promise<{ payload: T | null; errorMessage: string; semantics: NativeApiSemantics }> {
  try {
    const payload = await loader();
    return {
      payload,
      errorMessage: "",
      semantics: extractNativeApiSemantics(payload),
    };
  } catch (error) {
    return {
      payload: null,
      errorMessage: toUserFacingErrorMessage(error, fallbackError),
      semantics: {},
    };
  }
}
