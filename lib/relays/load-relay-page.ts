import { cache } from "react";

import {
  extractRelayHealthRows,
  selectRelayHealthForHost,
} from "@/components/explorer/stats-utils";
import {
  getPopularRelays,
  getRelayHealth,
  getRelayInfo,
  getRelayProbeHealth,
} from "@/lib/api/endpoints";
import { isApiError } from "@/lib/api/errors";
import { relayInfoUrlForHost } from "@/lib/relays/nip11";
import { getRequestNowMs } from "@/lib/time/request-now";
import type {
  PopularRelaysResponse,
  RelayHealthResponse,
  RelayInfoResponse,
  RelayProbeHealthResponse,
} from "@/lib/types/api";

export type RelayDirectorySnapshot = {
  popular: PopularRelaysResponse | null;
  popularError: unknown;
  health: RelayHealthResponse | null;
  healthError: unknown;
  probes: RelayProbeHealthResponse | null;
  probeError: unknown;
  nowMs: number;
  relayUrl: string;
  info: RelayInfoResponse | null;
  infoError: unknown;
};

/**
 * Shared by the relay page and its metadata. A 404 from the info endpoint is
 * an empty document, not a failed page.
 */
export const loadRelayDirectorySnapshot = cache(
  async (host: string): Promise<RelayDirectorySnapshot> => {
    const [popularResult, healthResult, probeResult] = await Promise.allSettled([
      getPopularRelays("shortTtl", { limit: 100 }),
      getRelayHealth("shortTtl"),
      getRelayProbeHealth("shortTtl", { limit: 200 }),
    ]);
    const popular = popularResult.status === "fulfilled" ? popularResult.value : null;
    const health = healthResult.status === "fulfilled" ? healthResult.value : null;
    const probes = probeResult.status === "fulfilled" ? probeResult.value : null;
    const nowMs = getRequestNowMs();
    const selected = selectRelayHealthForHost(extractRelayHealthRows(health), host, nowMs);
    const relayUrl = relayInfoUrlForHost({
      host,
      popularUrls: popular?.relays.map((relay) => relay.normalized_url),
      probeUrls: probes?.relays.map((relay) => relay.normalized_url),
      healthRelay: selected.row?.relay,
    });

    let info: RelayInfoResponse | null = null;
    let infoError: unknown = null;
    try {
      info = await getRelayInfo("shortTtl", relayUrl);
    } catch (error) {
      // A missing registry row is an empty document, not a page failure.
      if (!(isApiError(error) && error.isNotFound)) {
        infoError = error;
      }
    }

    return {
      popular,
      popularError: popularResult.status === "rejected" ? popularResult.reason : null,
      health,
      healthError: healthResult.status === "rejected" ? healthResult.reason : null,
      probes,
      probeError: probeResult.status === "rejected" ? probeResult.reason : null,
      nowMs,
      relayUrl,
      info,
      infoError,
    };
  }
);
