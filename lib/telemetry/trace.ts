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
