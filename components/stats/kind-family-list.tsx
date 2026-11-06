"use client";

import { useState } from "react";

import { KindChip } from "@/components/explorer/entity-chips";
import { AdjacentValue } from "@/components/stats/ranked-list";
import { ShareBar } from "@/components/relays/share-bar";
import { countNoun } from "@/lib/stats/plural";
import { kindFamilyLabel } from "@/lib/stats/surface-display";
import type { KindFamilyStats } from "@/lib/types/surfaces";

const VISIBLE = 8;

export function KindFamilyList({ families }: { families: KindFamilyStats[] }) {
  const total = families.reduce((sum, family) => sum + (family.event_count ?? 0), 0);
  return (
    <ul className="space-y-6">
      {families.map((family) => (
        <Family key={family.family} family={family} total={total} />
      ))}
    </ul>
  );
}

function Family({ family, total }: { family: KindFamilyStats; total: number }) {
  const [open, setOpen] = useState(false);
  const kinds = [...(family.kinds ?? [])].sort(
    (left, right) => (right.event_count ?? 0) - (left.event_count ?? 0)
  );
  const visible = open ? kinds : kinds.slice(0, VISIBLE);
  const hidden = kinds.length - visible.length;
  const count = family.event_count ?? 0;
  return (
    <li>
      <AdjacentValue
        label={<span className="text-ink font-medium">{kindFamilyLabel(family.family)}</span>}
        value={count.toLocaleString()}
      />
      <ShareBar
        value={count}
        max={Math.max(total, 1)}
        label={`${kindFamilyLabel(family.family)} share of indexed events`}
      />
      <ul className="mt-3 space-y-2">
        {visible.map((kind) => (
          <li key={kind.kind}>
            <AdjacentValue
              label={<KindChip kind={kind.kind} />}
              value={
                <>
                  {(kind.event_count ?? 0).toLocaleString()}
                  {typeof kind.unique_authors === "number"
                    ? ` · ${countNoun(kind.unique_authors, "author", "authors")}`
                    : ""}
                </>
              }
            />
          </li>
        ))}
      </ul>
      {hidden > 0 ? (
        <button type="button" className="text-link mt-2 text-sm" onClick={() => setOpen(true)}>
          Show all {kinds.length.toLocaleString()}
        </button>
      ) : open && kinds.length > VISIBLE ? (
        <button type="button" className="text-link mt-2 text-sm" onClick={() => setOpen(false)}>
          Show fewer
        </button>
      ) : null}
    </li>
  );
}
