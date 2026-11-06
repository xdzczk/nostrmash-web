"use client";

import { useState } from "react";

import { SectionCard } from "@/components/ui/section-card";
import type { EventLabel } from "@/lib/types/surfaces";

const VISIBLE_LIMIT = 8;

/** Trend markers are machine labels, not something a reader chose. */
function hiddenLabelText(hiddenPeople: number, hiddenMachine: number): string {
  const parts: string[] = [];
  if (hiddenPeople > 0) {
    parts.push(`${hiddenPeople.toLocaleString()} more ${hiddenPeople === 1 ? "label" : "labels"}`);
  }
  if (hiddenMachine > 0) {
    parts.push(
      `${hiddenMachine.toLocaleString()} machine ${hiddenMachine === 1 ? "label" : "labels"}`
    );
  }
  return `Show ${parts.join(" and ")}`;
}

function isMachineNamespace(namespace: string | undefined): boolean {
  if (!namespace) return false;
  return /trend|algo|spam-score|classifier/i.test(namespace);
}

type GroupedLabel = {
  key: string;
  label: string;
  namespace?: string;
  count: number;
  machine: boolean;
};

export function groupEventLabels(labels: EventLabel[]): GroupedLabel[] {
  const groups = new Map<string, GroupedLabel>();
  for (const label of labels) {
    const name = label.label?.trim();
    if (!name) continue;
    const namespace = label.namespace?.trim() || undefined;
    const key = `${namespace ?? ""}:${name}`;
    const existing = groups.get(key);
    if (existing) {
      existing.count += 1;
      continue;
    }
    groups.set(key, {
      key,
      label: name,
      namespace,
      count: 1,
      machine: isMachineNamespace(namespace),
    });
  }
  return [...groups.values()].sort(
    (left, right) => right.count - left.count || left.label.localeCompare(right.label)
  );
}

export function EventLabelSummary({ labels }: { labels: EventLabel[] }) {
  const grouped = groupEventLabels(labels);
  const [showAll, setShowAll] = useState(false);
  const people = grouped.filter((label) => !label.machine);
  const machine = grouped.filter((label) => label.machine);
  const visible = showAll ? grouped : people.slice(0, VISIBLE_LIMIT);
  const hiddenPeople = Math.max(0, people.length - VISIBLE_LIMIT);
  const hiddenMachine = machine.length;
  const hidden = showAll ? 0 : hiddenPeople + hiddenMachine;
  if (grouped.length === 0) return null;
  // A machine-only note has a count in Details & provenance. The section
  // itself would be a heading and a toggle with no chips.
  if (!showAll && visible.length === 0) return null;

  return (
    <SectionCard
      id="labels"
      title="Labels"
      description={`Labels attached to this note by other users and services (NIP-32). ${grouped.length.toLocaleString()} distinct ${grouped.length === 1 ? "label" : "labels"}.`}
    >
      {visible.length > 0 ? (
        <ul className="flex flex-wrap gap-2">
          {visible.map((label) => (
            <li
              key={label.key}
              className="border-edge-strong inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs"
            >
              <span className="text-ink">{label.label}</span>
              {label.namespace ? <span className="text-ink-faint">{label.namespace}</span> : null}
              {label.count > 1 ? (
                <span className="bg-surface-sunken text-ink-muted rounded-full px-1.5 tabular-nums">
                  {label.count.toLocaleString()}
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
      {hidden > 0 ? (
        <button type="button" className="text-link mt-3 text-sm" onClick={() => setShowAll(true)}>
          {hiddenLabelText(hiddenPeople, hiddenMachine)}
        </button>
      ) : showAll && (people.length > VISIBLE_LIMIT || machine.length > 0) ? (
        <button type="button" className="text-link mt-3 text-sm" onClick={() => setShowAll(false)}>
          Show fewer
        </button>
      ) : null}
    </SectionCard>
  );
}
