import { addTelemetryBreadcrumb } from "@/lib/telemetry/sentry";
import type { DiscoverMode, DiscoverView } from "@/lib/discover/views";
import type { StatsWindow } from "@/lib/search-params/window";

export type DiscoverTelemetryEvent =
  | {
      name: "window_change";
      view: DiscoverView;
      window: StatsWindow;
    }
  | {
      name: "navigation";
      view: DiscoverView;
      mode?: DiscoverMode;
    }
  | {
      name: "continuation";
      view: DiscoverView;
      mode?: DiscoverMode;
    }
  | {
      name: "reason_source";
      view: DiscoverView;
      source: "server" | "inferred";
    }
  | {
      name: "section_degradation";
      view: DiscoverView;
      section: "notes" | "profiles" | "topics" | "links" | "conversations" | "network";
    }
  | {
      name: "rank_evidence";
      view: DiscoverView;
      evidence: "reason" | "confidence" | "source_breadth" | "movement";
    };

export type DiscoverTelemetrySink = (event: DiscoverTelemetryEvent) => void;

export const sentryDiscoverTelemetrySink: DiscoverTelemetrySink = (event) => {
  addTelemetryBreadcrumb("discover", event.name, { ...event });
};

/**
 * Privacy-safe Discover telemetry. Event payloads intentionally exclude note
 * content, event IDs, pubkeys, hashtags, domains, and search text.
 */
export function recordDiscoverEvent(
  event: DiscoverTelemetryEvent,
  sink: DiscoverTelemetrySink = sentryDiscoverTelemetrySink
) {
  sink(event);
}
