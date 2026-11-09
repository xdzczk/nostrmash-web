import {
  readSearchParam,
  toUrlSearchParams,
  type RouteSearchParams,
} from "@/lib/search-params/pagination";

/** localStorage key. The server cannot read this. */
export const VIEWER_STORAGE_KEY = "nm-viewer";

/** Cookie the server can read. SameSite=Lax, path=/, about a year. */
export const VIEWER_COOKIE = "nm_viewer";

/** One year, in seconds. Matches the language cookie. */
export const VIEWER_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/**
 * Highest `offset` a viewer ranking accepts. Past this the API returns 400.
 * Global rankings stay at 5000.
 */
export const VIEWER_MAX_OFFSET = 500;

const NPUB_PATTERN = /^npub1[02-9ac-hj-np-z]+$/i;
const HEX_PUBKEY_PATTERN = /^[0-9a-f]{64}$/i;

/**
 * The same npub / 64-hex check Your view uses before it stores a key.
 * A value that fails this is never written and never sent upstream.
 */
export function parseViewer(value: string | undefined): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!NPUB_PATTERN.test(trimmed) && !HEX_PUBKEY_PATTERN.test(trimmed)) return undefined;
  return trimmed;
}

export function readViewer(params: RouteSearchParams): string | undefined {
  return parseViewer(readSearchParam(params, "viewer"));
}

/** True when the URL includes a non-empty `viewer`, even if the value is invalid. */
export function hasExplicitViewer(params: RouteSearchParams): boolean {
  return readSearchParam(params, "viewer") !== undefined;
}

export type ViewerCookieOptions = {
  maxAge: number;
  sameSite: "lax";
  path: "/";
};

export type ViewerCookieMutation =
  | { action: "set"; name: string; value: string; options: ViewerCookieOptions }
  | { action: "clear"; name: string };

/** Cookie write for a saved key. Anything that is not an npub or hex pubkey clears it. */
export function viewerCookieMutation(value: string | undefined): ViewerCookieMutation {
  const parsed = parseViewer(value);
  if (!parsed) return { action: "clear", name: VIEWER_COOKIE };
  return {
    action: "set",
    name: VIEWER_COOKIE,
    value: parsed,
    options: {
      maxAge: VIEWER_COOKIE_MAX_AGE,
      sameSite: "lax",
      path: "/",
    },
  };
}

export function serializeViewerCookie(value: string | undefined): string {
  const mutation = viewerCookieMutation(value);
  if (mutation.action === "clear") {
    return `${VIEWER_COOKIE}=; Max-Age=0; Path=/; SameSite=Lax`;
  }
  return `${VIEWER_COOKIE}=${mutation.value}; Max-Age=${mutation.options.maxAge}; Path=/; SameSite=Lax`;
}

export type ViewerPreference = {
  viewer?: string;
  /** Present when a saved key should be written onto this request's URL. */
  redirectTo?: string;
};

/**
 * An explicit `viewer` wins for this request and is not written back to the
 * saved key. An invalid explicit value is not sent upstream and does not fall
 * through to the cookie. With no `viewer` param, a valid cookie redirects to
 * the same path so the URL, not the cookie, is the cache key.
 */
export function resolveViewerPreference(
  path: string,
  params: RouteSearchParams,
  cookieValue: string | undefined
): ViewerPreference {
  if (hasExplicitViewer(params)) {
    const viewer = parseViewer(readSearchParam(params, "viewer"));
    return viewer ? { viewer } : {};
  }
  const fromCookie = parseViewer(cookieValue);
  if (!fromCookie) return {};
  const next = toUrlSearchParams(params);
  next.set("viewer", fromCookie);
  const query = next.toString();
  return { redirectTo: query.length > 0 ? `${path}?${query}` : path };
}
