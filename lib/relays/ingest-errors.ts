import {
  partitionRelayHealth,
  relayCheckpointIsStale,
  type RelayHealthSummary,
} from "@/components/explorer/stats-utils";

export type IngestFailureKind =
  "handshake" | "dns" | "certificate" | "refused" | "timeout" | "unreachable" | "other";

export type AttentionGroupId = IngestFailureKind | "stale" | "unknown";

const FAILURE_COPY: Record<
  IngestFailureKind | "stale" | "unknown",
  { label: string; summary: string }
> = {
  handshake: {
    label: "Handshake refused",
    summary: "The relay refused the websocket handshake.",
  },
  dns: {
    label: "Name did not resolve",
    summary: "The relay's name did not resolve.",
  },
  certificate: {
    label: "Certificate mismatch",
    summary: "The relay's certificate did not match its name.",
  },
  refused: {
    label: "Connection refused",
    summary: "The relay refused the connection.",
  },
  timeout: {
    label: "Timed out",
    summary: "The connection timed out.",
  },
  unreachable: {
    label: "Could not be reached",
    summary: "The relay could not be reached.",
  },
  other: {
    label: "Failed check",
    summary: "The ingest check failed.",
  },
  stale: {
    label: "Last check succeeded",
    summary: "The last ingest check succeeded, and it is older than a day.",
  },
  unknown: {
    label: "No status",
    summary: "These checks did not say whether the relay was healthy.",
  },
};

/** Map a raw dial error onto a kind. The raw string stays behind a disclosure. */
export function classifyIngestError(error: string | undefined): IngestFailureKind | "none" {
  if (!error || error.trim().length === 0) return "none";
  const value = error.toLowerCase();
  if (
    value.includes("certificate") ||
    value.includes("x509") ||
    value.includes("unrecognized name")
  ) {
    return "certificate";
  }
  if (value.includes("handshake")) return "handshake";
  if (value.includes("no such host") || value.includes("lookup")) return "dns";
  if (value.includes("connection refused")) return "refused";
  if (
    value.includes("timeout") ||
    value.includes("timed out") ||
    value.includes("operation was canceled") ||
    value.includes("operation was cancelled")
  ) {
    return "timeout";
  }
  if (
    value.includes("no route") ||
    value.includes("unreachable") ||
    value.includes("eof") ||
    value.includes("connection reset")
  ) {
    return "unreachable";
  }
  return "other";
}

export function ingestFailureCopy(id: AttentionGroupId): { label: string; summary: string } {
  return FAILURE_COPY[id];
}

export interface AttentionGroup {
  id: AttentionGroupId;
  label: string;
  summary: string;
  rows: RelayHealthSummary[];
}

function groupId(row: RelayHealthSummary): AttentionGroupId {
  if (row.healthy === true) return "stale";
  if (row.healthy == null) return "unknown";
  const kind = classifyIngestError(row.lastError);
  return kind === "none" ? "other" : kind;
}

function bucketAttention(rows: RelayHealthSummary[], archival: boolean): AttentionGroup[] {
  const buckets = new Map<AttentionGroupId, RelayHealthSummary[]>();
  for (const row of rows) {
    const id = groupId(row);
    const list = buckets.get(id) ?? [];
    list.push(row);
    buckets.set(id, list);
  }

  const failing = (
    ["handshake", "dns", "certificate", "refused", "timeout", "unreachable", "other"] as const
  )
    .filter((id) => buckets.has(id))
    .map((id) => ({ id, ...ingestFailureCopy(id), rows: buckets.get(id) ?? [] }))
    .sort((left, right) => right.rows.length - left.rows.length);

  const resting: AttentionGroup[] = [];
  for (const id of ["stale", "unknown"] as const) {
    const grouped = buckets.get(id);
    if (!grouped || grouped.length === 0) continue;
    resting.push({ id, ...ingestFailureCopy(id), rows: grouped });
  }

  return archival ? [...resting, ...failing] : [...failing, ...resting];
}

/**
 * Fresh hosts first. Current failures are grouped by kind.
 * Older checks, healthy or not, stay in the record so they do not read as a live outage.
 */
export function groupRelayAttention(
  rows: RelayHealthSummary[],
  nowMs: number
): { fresh: RelayHealthSummary[]; groups: AttentionGroup[]; earlierGroups: AttentionGroup[] } {
  const { attention, current } = partitionRelayHealth(rows, nowMs);
  const currentAttention = attention.filter((row) => !relayCheckpointIsStale(row, nowMs));
  const earlier = attention.filter((row) => relayCheckpointIsStale(row, nowMs));

  return {
    fresh: current,
    groups: bucketAttention(currentAttention, false),
    earlierGroups: bucketAttention(earlier, true),
  };
}
