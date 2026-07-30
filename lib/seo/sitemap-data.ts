import {
  getTrendingDomains,
  getTrendingHashtags,
  getTrendingNotes,
  getTrendingProfiles,
} from "@/lib/api/endpoints";
import { absoluteUrl } from "@/lib/seo/metadata";
import type { MetadataRoute } from "next";

const STATIC_PATHS = [
  "/",
  "/search",
  "/trending/notes",
  "/trending/profiles",
  "/trending/hashtags",
  "/trending/domains",
  "/trending/long-form",
  "/stats",
  "/relays",
  "/relays/health",
  "/relays/popular",
  "/methodology",
  "/discovery/conversations/hot",
  "/discovery/profiles/rising",
];

async function collectPagedNotes(window: "24h" | "7d", max = 400) {
  const ids = new Set<string>();
  for (let offset = 0; offset < max; offset += 100) {
    const page = await getTrendingNotes("shortTtl", { window, limit: 100, offset }).catch(
      () => null
    );
    const notes = Array.isArray(page?.notes) ? page.notes : [];
    if (notes.length === 0) break;
    for (const note of notes) {
      const id =
        (typeof note.id === "string" && note.id) ||
        (typeof note.event_id === "string" && note.event_id) ||
        "";
      if (id) ids.add(id.toLowerCase());
    }
    if (notes.length < 100) break;
  }
  return [...ids];
}

export async function buildSitemapEntries(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const entries: MetadataRoute.Sitemap = STATIC_PATHS.map((path) => ({
    url: absoluteUrl(path),
    lastModified: now,
    changeFrequency: path === "/" ? "hourly" : "daily",
    priority: path === "/" ? 1 : 0.7,
  }));

  const [notes24h, notes7d, profiles, hashtags, domains] = await Promise.all([
    collectPagedNotes("24h", 300).catch(() => [] as string[]),
    collectPagedNotes("7d", 300).catch(() => [] as string[]),
    getTrendingProfiles("shortTtl", { window: "24h", limit: 100 }).catch(() => null),
    getTrendingHashtags("shortTtl", { window: "24h", limit: 100 }).catch(() => null),
    getTrendingDomains("shortTtl", { window: "24h", limit: 100 }).catch(() => null),
  ]);

  for (const id of new Set([...notes24h, ...notes7d])) {
    entries.push({
      url: absoluteUrl(`/notes/${encodeURIComponent(id)}`),
      changeFrequency: "hourly",
      priority: 0.6,
    });
  }

  const profileRows = Array.isArray(profiles?.profiles) ? profiles.profiles : [];
  for (const profile of profileRows) {
    const key =
      (typeof profile.npub === "string" && profile.npub) ||
      (typeof profile.pubkey === "string" && profile.pubkey) ||
      "";
    if (!key) continue;
    entries.push({
      url: absoluteUrl(`/profiles/${encodeURIComponent(key)}`),
      changeFrequency: "daily",
      priority: 0.55,
    });
  }

  const hashtagRows = Array.isArray(hashtags?.hashtags) ? hashtags.hashtags : [];
  for (const row of hashtagRows) {
    const tag = typeof row.hashtag === "string" ? row.hashtag : "";
    if (!tag) continue;
    entries.push({
      url: absoluteUrl(`/hashtags/${encodeURIComponent(tag)}`),
      changeFrequency: "hourly",
      priority: 0.5,
    });
  }

  const domainRows = Array.isArray(domains?.domains) ? domains.domains : [];
  for (const row of domainRows) {
    const domain = typeof row.domain === "string" ? row.domain : "";
    if (!domain) continue;
    entries.push({
      url: absoluteUrl(`/domains/${encodeURIComponent(domain)}`),
      changeFrequency: "daily",
      priority: 0.45,
    });
  }

  return entries.slice(0, 5000);
}
