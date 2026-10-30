import { unstable_rethrow } from "next/navigation";

import { extractNativeApiSemantics } from "@/lib/api/normalize";
import {
  isDiscovery30dHidden,
  requestDiscovery,
  syncDiscoveryWindow,
} from "@/lib/discover/window-fallback";
import { toUserFacingErrorMessage } from "@/lib/errors/user-message";
import {
  buildContinuationHref,
  readSearchParam,
  toUrlSearchParams,
} from "@/lib/search-params/pagination";
import { selectableStatsWindows, type StatsWindow } from "@/lib/search-params/window";
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

export async function readRankedListContext(
  resolvedSearchParams: ResolvedSearchParams,
  path: string
): Promise<{
  cursor: string | undefined;
  window: StatsWindow;
  windows: readonly StatsWindow[];
  currentSearchParams: URLSearchParams;
  buildCursorContinuation: (nextCursor: string | undefined) => string;
}> {
  const cursor = readSearchParam(resolvedSearchParams, "cursor");
  const currentSearchParams = toUrlSearchParams(resolvedSearchParams);
  const window = await syncDiscoveryWindow(path, resolvedSearchParams);
  const windows = selectableStatsWindows(!(await isDiscovery30dHidden()));

  return {
    cursor,
    window,
    windows,
    currentSearchParams,
    buildCursorContinuation: (nextCursor) =>
      buildContinuationHref(path, currentSearchParams, "cursor", nextCursor),
  };
}

/** Keep a fire-and-forget load from surfacing as an unhandled rejection. */
export function startRankedLoad<T>(promise: Promise<T>): Promise<T> {
  promise.catch(() => undefined);
  return promise;
}

export async function loadRankedListPayload<T>(
  loader: () => Promise<T>,
  fallbackError: string,
  discovery?: { window: StatsWindow; path: string; params: URLSearchParams }
): Promise<{ payload: T | null; errorMessage: string; semantics: NativeApiSemantics }> {
  try {
    const payload = discovery
      ? await requestDiscovery(discovery.window, discovery.path, discovery.params, () => loader())
      : await loader();
    return {
      payload,
      errorMessage: "",
      semantics: extractNativeApiSemantics(payload),
    };
  } catch (error) {
    unstable_rethrow(error);
    return {
      payload: null,
      errorMessage: toUserFacingErrorMessage(error, fallbackError),
      semantics: {},
    };
  }
}
