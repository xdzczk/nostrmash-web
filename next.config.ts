import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

// Only needed for `next dev` bindings. Running during `next build` can crash
// local Miniflare/workerd (SQLite schema mismatch) and is unused in CI builds.
if (process.env.NODE_ENV === "development") {
  void initOpenNextCloudflareForDev();
}

// CSP (incl. per-request script nonce + embed frame-ancestors carve-out) is set
// in middleware.ts so Next can stamp nonces onto framework scripts during SSR.
const securityHeaders = [
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains; preload",
  },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // @sentry/nextjs (node entry) pulls Orchestrion / APM packages that load
  // es-module-lexer's inline WASM. Cloudflare Workers reject WebAssembly.compile()
  // from buffers ("Wasm code generation disallowed by embedder"). Stub them —
  // they only exist for Node Module._compile instrumentation.
  serverExternalPackages: [
    "@apm-js-collab/code-transformer",
    "@apm-js-collab/code-transformer-bundler-plugins",
    "@apm-js-collab/tracing-hooks",
  ],
  turbopack: {
    resolveAlias: {
      "@apm-js-collab/code-transformer": "./stubs/empty-code-transformer.js",
      "@apm-js-collab/code-transformer-bundler-plugins":
        "./stubs/empty-code-transformer-bundler-plugins.js",
      "@apm-js-collab/tracing-hooks": "./stubs/empty-tracing-hooks.js",
    },
  },
  images: {
    // Cloudflare Workers image optimization is enabled via the IMAGES binding in wrangler.jsonc.
    remotePatterns: [
      { protocol: "https", hostname: "**" },
      { protocol: "http", hostname: "localhost" },
      { protocol: "http", hostname: "127.0.0.1" },
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
  widenClientFileUpload: true,
  // Disable automatic tunnel route; OpenNext/Workers handle routing themselves.
  tunnelRoute: undefined,
  webpack: {
    treeshake: {
      removeDebugLogging: true,
    },
  },
});
