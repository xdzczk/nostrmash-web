import type { LabelCount, LabelStatsResponse } from "@/lib/types/surfaces";

const BRIDGE_NAMESPACES = new Set(["pink.momostr", "pub.ditto.trends"]);

export type LabelNamespaceRow = {
  namespace: string;
  total: number;
  top: LabelCount[];
};

export type GroupedLabelStats = {
  namespaces: LabelNamespaceRow[];
  bridge: { total: number; labels: number } | null;
};

function isUrlLabel(value: string): boolean {
  const trimmed = value.trim();
  return /^https?:\/\//i.test(trimmed) || trimmed.includes("://");
}

function isBridgeNamespace(namespace: string, labels: LabelCount[]): boolean {
  if (BRIDGE_NAMESPACES.has(namespace)) return true;
  return labels.length > 0 && labels.every((label) => isUrlLabel(label.label));
}

/** One row per human namespace, plus a single row for bridge and trend markers. */
export function groupLabelCounts(labels: LabelCount[]): GroupedLabelStats {
  const byNamespace = new Map<string, LabelCount[]>();
  for (const label of labels) {
    const namespace = label.namespace.trim() || "(none)";
    const list = byNamespace.get(namespace) ?? [];
    list.push(label);
    byNamespace.set(namespace, list);
  }

  const namespaces: LabelNamespaceRow[] = [];
  let bridgeTotal = 0;
  let bridgeLabels = 0;
  for (const [namespace, items] of byNamespace) {
    const total = items.reduce((sum, item) => sum + (item.count ?? 0), 0);
    if (isBridgeNamespace(namespace, items)) {
      bridgeTotal += total;
      bridgeLabels += items.length;
      continue;
    }
    const top = [...items]
      .sort(
        (left, right) =>
          (right.count ?? 0) - (left.count ?? 0) || left.label.localeCompare(right.label)
      )
      .slice(0, 3);
    namespaces.push({ namespace, total, top });
  }
  namespaces.sort(
    (left, right) => right.total - left.total || left.namespace.localeCompare(right.namespace)
  );
  return {
    namespaces,
    bridge: bridgeLabels > 0 ? { total: bridgeTotal, labels: bridgeLabels } : null,
  };
}

export function labelStatsVisible(data: LabelStatsResponse | null): boolean {
  if (!data) return false;
  const grouped = groupLabelCounts(data.labels ?? []);
  const agree = data.language_agreement?.agree ?? 0;
  const disagree = data.language_agreement?.disagree ?? 0;
  return grouped.namespaces.length > 0 || grouped.bridge !== null || agree > 0 || disagree > 0;
}
