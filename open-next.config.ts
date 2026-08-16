import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import r2IncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache";
import { withRegionalCache } from "@opennextjs/cloudflare/overrides/incremental-cache/regional-cache";

export default defineCloudflareConfig({
  // Puts Cloudflare's free per-datacenter Cache API in front of the
  // R2-backed incremental cache. Repeat hits within the same datacenter are
  // served without touching R2, which cuts read ops and, more importantly,
  // avoids multiple colos independently regenerating (and writing) the same
  // stale entry at once. We don't have cache purge wired up, so "long-lived"
  // keeps the regional cache refreshed from R2 on every hit for correctness.
  incrementalCache: withRegionalCache(r2IncrementalCache, { mode: "long-lived" }),
});
