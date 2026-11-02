declare module "*/.open-next/worker.js" {
  type WorkerContext = {
    waitUntil(promise: Promise<unknown>): void;
    passThroughOnException(): void;
  };
  const worker: {
    fetch(request: Request, env: unknown, ctx: WorkerContext): Promise<Response>;
  };
  export const BucketCachePurge: unknown;
  export const DOQueueHandler: unknown;
  export const DOShardedTagCache: unknown;
  export default worker;
}
