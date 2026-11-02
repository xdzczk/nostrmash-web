"use client";

import { useCallback, useSyncExternalStore } from "react";

import {
  parseBlossomBlob,
  selectBlossomImageSrc,
  type BlossomImageSnapshot,
} from "@/lib/media/blossom";

const EMPTY: BlossomImageSnapshot = {
  failed: new Set<string>(),
  resolved: new Map<string, string>(),
};

let snapshot: BlossomImageSnapshot = EMPTY;
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot() {
  return snapshot;
}

function getServerSnapshot() {
  return EMPTY;
}

function publish(next: BlossomImageSnapshot) {
  snapshot = next;
  for (const listener of listeners) listener();
}

function clearFailures() {
  if (snapshot.failed.size === 0) return;
  publish({ failed: new Set(), resolved: snapshot.resolved });
}

// A dead network marks every host failed. Coming back online should try again.
if (typeof window !== "undefined") {
  window.addEventListener("online", clearFailures);
}

/** Drops remembered failures and hits. Tests use this so cases do not share a cache. */
export function resetBlossomImageCache() {
  if (snapshot === EMPTY) return;
  publish(EMPTY);
}

function markFailed(url: string) {
  if (snapshot.failed.has(url)) return;
  const failed = new Set(snapshot.failed);
  failed.add(url);
  const resolved = new Map(snapshot.resolved);
  for (const [hash, resolvedUrl] of resolved) {
    if (resolvedUrl === url) resolved.delete(hash);
  }
  publish({ failed, resolved });
}

function markResolved(hash: string, url: string) {
  if (snapshot.failed.has(url)) return;
  if (snapshot.resolved.get(hash) === url) return;
  const resolved = new Map(snapshot.resolved);
  resolved.set(hash, url);
  publish({ failed: snapshot.failed, resolved });
}

/**
 * URL a blossom image should use right now. The author's host is tried first.
 * After it errors, the same hash is requested from other public servers.
 * A hit is remembered so later images of that blob skip the dead host.
 */
export function useBlossomImageSrc(original: string | null) {
  const current = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const selected = selectBlossomImageSrc(original, current);

  const onError = useCallback(() => {
    if (selected.src) markFailed(selected.src);
  }, [selected.src]);

  const onLoad = useCallback(() => {
    if (!original || !selected.src || selected.failed) return;
    const blob = parseBlossomBlob(original);
    if (!blob) return;
    markResolved(blob.hash, selected.src);
  }, [original, selected.failed, selected.src]);

  return {
    src: selected.src,
    failed: selected.failed,
    onError,
    onLoad,
  };
}
