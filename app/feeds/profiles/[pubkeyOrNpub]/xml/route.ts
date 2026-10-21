import { isApiError } from "@/lib/api/errors";
import { getAuthorEvents, getProfileSummary } from "@/lib/api/endpoints";
import { isValidPubkeyOrNpubParam, resolvePubkeyParam } from "@/lib/routing/params";
import { absoluteUrl } from "@/lib/seo/metadata";
import { buildRssXml, type RssItem } from "@/lib/seo/rss";
import type { Profile } from "@/lib/types/api";

export const revalidate = 300;

type Params = Promise<{ pubkeyOrNpub: string }>;

export async function GET(_request: Request, { params }: { params: Params }) {
  const { pubkeyOrNpub } = await params;
  if (!isValidPubkeyOrNpubParam(pubkeyOrNpub)) {
    return new Response("Invalid profile", { status: 400 });
  }
  const pubkey = resolvePubkeyParam(pubkeyOrNpub) ?? pubkeyOrNpub;

  // The events endpoint returns an empty 200 for unknown pubkeys, so the
  // summary is what tells us whether this profile exists at all. Keep the
  // feed's 404 in step with the profile page.
  const [summaryResult, eventsResult] = await Promise.allSettled([
    getProfileSummary(pubkey, "shortTtl"),
    getAuthorEvents(pubkey, "shortTtl", { limit: 50 }),
  ]);

  if (summaryResult.status === "rejected") {
    const reason: unknown = summaryResult.reason;
    if (isApiError(reason) && reason.isNotFound) {
      return new Response("Profile not found", { status: 404 });
    }
  }
  if (eventsResult.status === "rejected") {
    return new Response("Failed to build feed", { status: 502 });
  }

  const summary = summaryResult.status === "fulfilled" ? summaryResult.value : null;
  const profile: Profile | null = summary
    ? (summary.profile ?? (summary as unknown as Profile))
    : null;
  const label =
    (typeof profile?.display_name === "string" && profile.display_name.trim()) ||
    (typeof profile?.name === "string" && profile.name.trim()) ||
    pubkeyOrNpub.slice(0, 18);

  const payload = eventsResult.value;
  const events = Array.isArray(payload.events) ? payload.events : [];
  const items: RssItem[] = [];
  for (const note of events) {
    const id =
      (typeof note.id === "string" && note.id) ||
      (typeof note.event_id === "string" && note.event_id) ||
      "";
    if (!id) continue;
    const content = typeof note.content === "string" ? note.content.trim() : "";
    items.push({
      title: content.slice(0, 80) || `Note ${id.slice(0, 12)}`,
      link: absoluteUrl(`/notes/${encodeURIComponent(id)}`),
      description: content.slice(0, 280) || "Author note",
      pubDate: typeof note.created_at === "number" ? new Date(note.created_at * 1000) : undefined,
    });
  }

  const xml = buildRssXml({
    title: `${label} · NostrMash`,
    link: absoluteUrl(`/profiles/${encodeURIComponent(pubkeyOrNpub)}`),
    description: `Recent notes from ${label} on Nostr.`,
    items,
  });

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=300, stale-while-revalidate=600",
    },
  });
}
