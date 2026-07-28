#!/usr/bin/env node
/**
 * Post-deploy smoke checks against the live site.
 * Usage: node scripts/prod-validate.mjs [baseUrl]
 */
const baseUrl = (
  process.argv[2] ||
  process.env.PROD_VALIDATE_BASE_URL ||
  "https://nostrmash.com"
).replace(/\/$/, "");

const failures = [];

async function check(name, fn) {
  try {
    await fn();
    console.log(`PASS  ${name}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    failures.push(`${name}: ${message}`);
    console.error(`FAIL  ${name}: ${message}`);
  }
}

async function fetchText(path, expectedType) {
  const response = await fetch(`${baseUrl}${path}`, {
    headers: { Accept: "*/*" },
    redirect: "follow",
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  const contentType = response.headers.get("content-type") ?? "";
  if (expectedType && !contentType.includes(expectedType)) {
    throw new Error(`expected content-type containing ${expectedType}, got ${contentType}`);
  }
  return { response, text: await response.text(), contentType };
}

await check("robots.txt", async () => {
  const { text } = await fetchText("/robots.txt", "text/plain");
  if (!/Sitemap:/i.test(text)) throw new Error("missing Sitemap directive");
});

await check("sitemap.xml", async () => {
  const { text } = await fetchText("/sitemap.xml", "xml");
  if (!text.includes("<urlset")) throw new Error("missing urlset");
});

await check("trending notes RSS", async () => {
  const { text, contentType } = await fetchText("/feeds/trending-notes.xml");
  if (!/rss|xml/i.test(contentType)) throw new Error(`unexpected type ${contentType}`);
  if (!text.includes("<rss") || !text.includes("<channel>")) {
    throw new Error("invalid RSS document");
  }
});

await check("oEmbed", async () => {
  const noteUrl = `${baseUrl}/notes/${"a".repeat(64)}`;
  const response = await fetch(`${baseUrl}/api/oembed?url=${encodeURIComponent(noteUrl)}`);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const json = await response.json();
  if (json.type !== "rich") throw new Error(`unexpected type ${json.type}`);
  if (!String(json.html).includes("/embed/notes/")) throw new Error("missing embed iframe");
});

await check("home OG + JSON-LD", async () => {
  const { text } = await fetchText("/", "text/html");
  if (!/property=["']og:title["']/.test(text)) throw new Error("missing og:title");
  const match = text.match(
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/i
  );
  if (!match) throw new Error("missing JSON-LD script");
  const parsed = JSON.parse(match[1]);
  if (parsed["@type"] !== "WebSite") throw new Error(`unexpected @type ${parsed["@type"]}`);
});

await check("default opengraph-image", async () => {
  const response = await fetch(`${baseUrl}/opengraph-image`);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("image/")) {
    throw new Error(`expected image/*, got ${contentType}`);
  }
});

await check("CSP nonce on home", async () => {
  const response = await fetch(`${baseUrl}/`);
  const csp = response.headers.get("content-security-policy") ?? "";
  if (!/script-src[^;]*'nonce-/.test(csp)) throw new Error("missing script nonce");
  if (/script-src[^;]*'unsafe-inline'/.test(csp)) {
    throw new Error("script-src still allows unsafe-inline");
  }
});

if (failures.length > 0) {
  console.error(`\n${failures.length} prod-validate check(s) failed against ${baseUrl}`);
  process.exit(1);
}

console.log(`\nAll prod-validate checks passed against ${baseUrl}`);
