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
    <section className="nm-signal-rule border-edge/70 border-y py-12 sm:py-16">
      <p className="nm-kicker">Interrupted signal</p>
      <h1 className="nm-display-lg text-ink-strong mt-5">This page couldn’t finish loading.</h1>
      <p className="text-ink-muted mt-4 max-w-xl text-base leading-7">
        The rest of NostrMash is still available. Retry this view now; if the interruption
        continues, return to Discover and choose another signal.
      </p>
      {error.digest ? (
        <p className="text-ink-faint mt-4 font-mono text-xs">Reference: {error.digest}</p>
      ) : null}
      <Button className="mt-7" size="md" onClick={reset}>
        Retry page
      </Button>
    </section>
  );
}
