"use client";

import Link from "@/components/app-link";
import { useSyncExternalStore } from "react";

const STORAGE_KEY = "nm-orientation-dismissed";
const listeners = new Set<() => void>();

function dismissed(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function subscribe(onStoreChange: () => void): () => void {
  listeners.add(onStoreChange);
  return () => listeners.delete(onStoreChange);
}

function dismiss() {
  try {
    window.localStorage.setItem(STORAGE_KEY, "1");
  } catch {
    // The note stays if this browser cannot store the choice.
  }
  listeners.forEach((listener) => listener());
}

export function Orientation() {
  const hidden = useSyncExternalStore(subscribe, dismissed, () => false);
  if (hidden) return null;

  return (
    <aside className="border-edge/70 text-ink-soft max-w-[46rem] border-t pt-2 text-sm leading-6 sm:pt-4">
      <p>
        Nostr is a way to publish notes and follow people without an account on one website.
        NostrMash reads public relays and explains what is moving.{" "}
        <Link href="/about" className="nm-action-link">
          What this is
        </Link>
        <button
          type="button"
          className="text-ink-faint hover:text-ink ml-3 inline-flex min-h-8 items-center text-xs"
          onClick={dismiss}
        >
          Dismiss
        </button>
      </p>
    </aside>
  );
}
