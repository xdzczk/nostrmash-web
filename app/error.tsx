"use client";

import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="border-edge bg-surface-sunken/40 space-y-3 rounded-md border p-4 text-sm">
      <p className="text-ink font-medium">This page ran into a loading issue</p>
      <p className="text-ink-muted">
        Something went wrong while rendering this page. You can retry, or go back and try another
        route.
      </p>
      {error.digest ? (
        <p className="text-ink-faint font-mono text-xs">Reference: {error.digest}</p>
      ) : null}
      <Button variant="danger" size="sm" onClick={reset}>
        Retry page
      </Button>
    </div>
  );
}
