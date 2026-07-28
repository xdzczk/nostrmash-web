import type { ReactNode } from "react";

import { Disclosure } from "@/components/ui/disclosure";
import { NativeSemanticsBadges } from "@/components/explorer/native-semantics-badges";
import type { NativeApiSemantics } from "@/lib/types/api";

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
  children,
}: {
  semantics?: Semantics | undefined;
  children?: ReactNode;
}) {
  const showSemantics = hasSemantics(semantics ?? null);
  if (!showSemantics && !children) return null;

  return (
    <Disclosure
      title="About this data"
      description="How the index shaped this view — consistency, trust, and scope."
    >
      <div className="flex flex-wrap items-center gap-2 text-xs">
        {showSemantics ? <NativeSemanticsBadges semantics={semantics} /> : null}
        {children}
      </div>
    </Disclosure>
  );
}
