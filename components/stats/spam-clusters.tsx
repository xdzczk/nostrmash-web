"use client";

import { useState } from "react";
import Link from "@/components/app-link";

import { countNoun } from "@/lib/stats/plural";
import type { DuplicateCluster } from "@/lib/types/surfaces";

export function SpamClusters({ clusters }: { clusters: DuplicateCluster[] }) {
  if (clusters.length === 0) return null;
  return (
    <ul className="divide-edge/60 max-w-[40rem] divide-y">
      {clusters.map((cluster) => (
        <Cluster key={cluster.fingerprint ?? cluster.first_event_id} cluster={cluster} />
      ))}
    </ul>
  );
}

function Cluster({ cluster }: { cluster: DuplicateCluster }) {
  const [open, setOpen] = useState(false);
  const authors = cluster.pubkey_count ?? 0;
  const events = cluster.event_count ?? 0;
  return (
    <li className="py-3">
      <button
        type="button"
        className="flex w-full items-baseline justify-between gap-4 text-left text-sm"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="text-ink">Repeated text</span>
        <span className="text-ink-muted shrink-0 tabular-nums">
          {countNoun(authors, "author", "authors")} · {countNoun(events, "note", "notes")}
        </span>
      </button>
      {open ? (
        <p className="text-ink-muted mt-2 text-sm">
          The index stores a fingerprint of the normalised text, not the text itself.
          {cluster.first_event_id ? (
            <>
              {" "}
              <Link
                href={`/notes/${encodeURIComponent(cluster.first_event_id)}`}
                className="text-link"
              >
                Example note
              </Link>
            </>
          ) : null}
        </p>
      ) : null}
    </li>
  );
}
