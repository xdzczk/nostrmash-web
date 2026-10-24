import type { RelayProbeHealthEntry } from "@/lib/types/api";

/**
 * Status implied by the latest connect / subscribe / EOSE checks.
 * `last_probe_status` can name a different outcome than those booleans, so
 * the row leads with the checks and keeps the recorded status as a note.
 */
export function checksProbeStatus(relay: RelayProbeHealthEntry): string | null {
  if (relay.last_connect_ok === false) return "connect failed";
  if (relay.last_subscribe_ok === false) return "subscribe failed";
  if (relay.last_eose_ok === false) return "end of events failed";
  if (
    relay.last_connect_ok === true &&
    relay.last_subscribe_ok === true &&
    relay.last_eose_ok === true
  ) {
    return "ok";
  }
  return null;
}

function sameProbeOutcome(checks: string, recorded: string): boolean {
  if (checks === recorded) return true;
  if (checks === "connect failed" && recorded.startsWith("connect")) return true;
  if (checks === "subscribe failed" && recorded.startsWith("subscribe")) return true;
  if (checks === "end of events failed" && recorded.startsWith("eose")) return true;
  if (checks === "ok" && recorded === "ok") return true;
  return false;
}

export function displayProbeStatus(relay: RelayProbeHealthEntry): string {
  return (
    checksProbeStatus(relay) ??
    (relay.last_probe_status ? relay.last_probe_status.replace(/_/g, " ") : "unknown")
  );
}

export function recordedProbeStatus(relay: RelayProbeHealthEntry): string | null {
  if (!relay.last_probe_status) return null;
  const recorded = relay.last_probe_status.replace(/_/g, " ");
  const checks = checksProbeStatus(relay);
  if (!checks || sameProbeOutcome(checks, recorded)) return null;
  return recorded;
}

export function probeNeedsAttention(relay: RelayProbeHealthEntry): boolean {
  return displayProbeStatus(relay) !== "ok";
}
