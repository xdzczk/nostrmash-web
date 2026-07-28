import { cache } from "react";

/**
 * Wall-clock "now" memoized for the current RSC request. Relative timestamps
 * and staleness checks use this so SSR HTML stays stable within a single render.
 */
export const getRequestNowMs = cache(() => Date.now());
