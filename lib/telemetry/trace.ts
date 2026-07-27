export async function traceApiCall<T>(spanName: string, operation: () => Promise<T>): Promise<T> {
  const startedAt = Date.now();
  try {
    const result = await operation();
    const durationMs = Date.now() - startedAt;
    if (durationMs > 800) {
      console.info(`[trace] ${spanName} succeeded in ${durationMs}ms`);
    }
    return result;
  } catch (error) {
    const durationMs = Date.now() - startedAt;
    console.error(`[trace] ${spanName} failed in ${durationMs}ms`, error);
    throw error;
  }
}

/** Log homepage upstream fan-out so TTFB regressions are visible in server logs. */
export function traceHomeFanOut(callCount: number, details: Record<string, boolean | number>) {
  if (callCount <= 1) return;
  console.info(`[trace] homepage fan-out: ${callCount} upstream calls`, details);
}
