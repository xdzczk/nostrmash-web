"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import {
  parseViewer,
  serializeViewerCookie,
  VIEWER_COOKIE,
  VIEWER_STORAGE_KEY,
} from "@/lib/search-params/viewer";

function storedViewer(): string | undefined {
  try {
    return parseViewer(window.localStorage.getItem(VIEWER_STORAGE_KEY) ?? undefined);
  } catch {
    return undefined;
  }
}

function cookieViewer(): string | undefined {
  const prefix = `${VIEWER_COOKIE}=`;
  const pair = document.cookie.split("; ").find((part) => part.startsWith(prefix));
  if (!pair) return undefined;
  return parseViewer(decodeURIComponent(pair.slice(prefix.length)));
}

/**
 * Your view writes localStorage and `nm_viewer` together. A key saved before
 * the cookie existed is copied across on the next Discover visit, then the
 * server redirect puts it on the URL. An explicit `viewer` in the URL is left
 * alone and is not stored.
 */
export function RememberViewer() {
  const router = useRouter();
  useEffect(() => {
    const stored = storedViewer();
    if (!stored || cookieViewer() === stored) return;
    document.cookie = serializeViewerCookie(stored);
    const url = new URL(window.location.href);
    if (!url.searchParams.has("viewer")) router.refresh();
  }, [router]);
  return null;
}
