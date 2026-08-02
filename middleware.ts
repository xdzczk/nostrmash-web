import { NextResponse, type NextRequest } from "next/server";

/**
 * Edge middleware (not proxy.ts): Next.js 16 prefers proxy.ts (Node runtime),
 * but @opennextjs/cloudflare 1.20.x still rejects Node middleware at build time.
 * Keep this on the Edge runtime until OpenNext ships stable proxy support.
 */

function buildCsp(nonce: string, isEmbed: boolean): string {
  const isDev = process.env.NODE_ENV === "development";
  return [
    "default-src 'self'",
    // Next extracts 'nonce-…' from this request CSP and stamps framework scripts.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    // Tailwind and component style attrs still need unsafe-inline for styles.
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "media-src 'self' https:",
    "font-src 'self' data:",
    "connect-src 'self' https: http://localhost:* http://127.0.0.1:*",
    // Privacy-enhanced YouTube embeds only — no X/Twitter frame hosts.
    "frame-src 'self' https://www.youtube-nocookie.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    isEmbed ? "frame-ancestors *" : "frame-ancestors 'none'",
    "upgrade-insecure-requests",
  ].join("; ");
}

function createRequestNonce(): string {
  // Prefer Web Crypto over Node Buffer — Edge/OpenNext Workers are not Node.
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

export function middleware(request: NextRequest) {
  const nonce = createRequestNonce();
  const isEmbed = request.nextUrl.pathname.startsWith("/embed/");
  const csp = buildCsp(nonce, isEmbed);

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", request.nextUrl.pathname);
  requestHeaders.set("x-nonce", nonce);
  // Next reads the nonce from the request CSP header during SSR.
  requestHeaders.set("Content-Security-Policy", csp);

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });
  response.headers.set("Content-Security-Policy", csp);
  if (isEmbed) {
    response.headers.delete("X-Frame-Options");
  } else {
    response.headers.set("X-Frame-Options", "DENY");
  }
  return response;
}

export const config = {
  matcher: [
    {
      source: "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
