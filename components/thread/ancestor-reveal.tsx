"use client";

import { useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";

/** Local toggle for ancestor notes that are already loaded. */
export function AncestorReveal({
  count,
  missing,
  children,
}: {
  count: number;
  /** Earlier notes the index knows about but could not load. */
  missing?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <li className="min-w-0 py-1">
      <Button variant="chip" size="sm" onClick={() => setOpen((value) => !value)}>
        {open ? "Hide earlier notes" : `Show ${count} earlier ${count === 1 ? "note" : "notes"}`}
      </Button>
      {missing ? (
        <p className="text-ink-dim mt-2 text-[13px]">Some earlier notes aren&apos;t indexed.</p>
      ) : null}
      {open ? <div className="mt-1">{children}</div> : null}
    </li>
  );
}
