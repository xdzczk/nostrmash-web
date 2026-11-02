import { NextResponse } from "next/server";

import {
  DISCOVERY_30D_HIDDEN_COOKIE,
  safeInternalPath,
} from "@/lib/discover/discovery-window-session";

/** Hide the 30d discovery range for this browser session, then continue. */
export function GET(request: Request) {
  const url = new URL(request.url);
  const next = safeInternalPath(url.searchParams.get("next"));
  const response = NextResponse.redirect(new URL(next, url.origin), 307);
  response.cookies.set({
    name: DISCOVERY_30D_HIDDEN_COOKIE,
    value: "1",
    path: "/",
    sameSite: "lax",
    httpOnly: true,
  });
  return response;
}
