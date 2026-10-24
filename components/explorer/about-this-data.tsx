import type { ReactNode } from "react";

import { Disclosure } from "@/components/ui/disclosure";
import { NativeSemanticsBadges } from "@/components/explorer/native-semantics-badges";
import { formatMetricLabel, isRecord } from "@/components/explorer/utils";
import type { NativeApiSemantics } from "@/lib/types/api";
import { formatRelativeAge } from "@/lib/time/freshness";

export type StatsSectionNote = {
  id: string;
  scope?: string;
  trustApplied?: boolean;
  summary: string;
  computedAt: Array<{ label: string; at: string }>;
};

/** Stats payloads describe each count under `sections`. Other `sections` shapes are ignored. */
export function readStatsSections(...payloads: unknown[]): StatsSectionNote[] {
  const notes = new Map<string, StatsSectionNote>();
  for (const payload of payloads) {
    const sections = isRecord(payload) ? payload.sections : undefined;
    if (!isRecord(sections)) continue;
    for (const [id, value] of Object.entries(sections)) {
      if (notes.has(id) || !isRecord(value)) continue;
      const summary = typeof value.summary === "string" ? value.summary.trim() : "";
      if (!summary) continue;
      const computed = isRecord(value.computed_at) ? value.computed_at : null;
      const computedAt = computed
        ? Object.entries(computed)
            .filter((entry): entry is [string, string] => typeof entry[1] === "string")
            .map(([label, at]) => ({ label, at }))
        : [];
      notes.set(id, {
        id,
        scope: typeof value.scope === "string" ? value.scope : undefined,
        trustApplied: typeof value.trust_applied === "boolean" ? value.trust_applied : undefined,
        summary,
        computedAt,
      });
    }
  }
  return [...notes.values()];
}

type Semantics = Pick<
  NativeApiSemantics,
  "consistency" | "trust_mode" | "trust_applied" | "result_scope"
> | null;

function hasSemantics(semantics: Semantics): boolean {
  if (!semantics) return false;
  return Boolean(
    (typeof semantics.consistency === "string" && semantics.consistency.length > 0) ||
    (typeof semantics.trust_mode === "string" && semantics.trust_mode.length > 0) ||
    typeof semantics.trust_applied === "boolean" ||
    semantics.result_scope
  );
}

/**
 * Collapsed index-internals panel. Keeps consistency / trust / scope out of the
 * hero so the default reading surface stays product-facing.
 */
export function AboutThisData({
  semantics,
  sections,
  children,
}: {
  semantics?: Semantics | undefined;
  sections?: StatsSectionNote[];
  children?: ReactNode;
}) {
  const notes = sections ?? [];
  const showSemantics = hasSemantics(semantics ?? null);
  if (!showSemantics && notes.length === 0 && !children) return null;

  return (
    <Disclosure
      title="About this data"
      description="How the index shaped this view — consistency, trust, and scope."
    >
      <div className="max-w-2xl space-y-3">
        {showSemantics ? (
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <NativeSemanticsBadges semantics={semantics} />
          </div>
        ) : null}
        {notes.length > 0 ? (
          <div className="space-y-3">
            {notes.map((section) => (
              <div key={section.id} className="space-y-1">
                <p className="text-ink text-sm">{formatMetricLabel(section.id)}</p>
                <p className="text-ink-muted text-sm leading-6">{section.summary}</p>
                {section.scope || section.computedAt.length > 0 ? (
                  <p className="text-ink-faint text-xs">
                    {[
                      section.scope ? formatMetricLabel(section.scope) : null,
                      section.trustApplied ? "Trust applied" : null,
                      ...section.computedAt.map((entry) => {
                        const age = formatRelativeAge(entry.at);
                        return age ? `${entry.label} ${age}` : entry.label;
                      }),
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        ) : null}
        {children ? <div className="text-ink-muted text-sm leading-6">{children}</div> : null}
      </div>
    </Disclosure>
  );
}
