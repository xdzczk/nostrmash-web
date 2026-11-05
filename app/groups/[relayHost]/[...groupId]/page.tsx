import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { NotesList } from "@/components/data/renderers";
import { EmptyState } from "@/components/explorer/empty-state";
import { PageHero } from "@/components/explorer/page-hero";
import { ErrorPanel } from "@/components/ui/status-panels";
import { getEventsBatch, getGroup, getGroupMessages } from "@/lib/api/endpoints";
import { extractEventAuthorPubkeys, fetchProfilesByPubkey } from "@/lib/api/profile-hydration";
import { toUserFacingErrorMessage } from "@/lib/errors/user-message";
import { normalizeValidatedRelayHost } from "@/lib/routing/params";
import { buildEntityMetadata } from "@/lib/seo/metadata";
import type { EventRecord, Profile } from "@/lib/types/api";

type Params = Promise<{ relayHost: string; groupId: string[] }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { relayHost, groupId } = await params;
  const host = normalizeValidatedRelayHost(relayHost);
  const id = groupId.join("/");
  return buildEntityMetadata({
    title: id || "Group",
    description: host ? `Messages in ${id} on ${host}.` : "Group messages.",
    path: host
      ? `/groups/${encodeURIComponent(host)}/${groupId.map(encodeURIComponent).join("/")}`
      : "/groups",
  });
}

export default async function GroupDetailPage({ params }: { params: Params }) {
  const { relayHost, groupId } = await params;
  const host = normalizeValidatedRelayHost(relayHost);
  const id = groupId
    .map((part) => {
      try {
        return decodeURIComponent(part);
      } catch {
        return part;
      }
    })
    .join("/");
  if (!host || !id) notFound();

  let name = id;
  let about = "";
  let detailError = "";
  try {
    const detail = await getGroup(host, id);
    name = detail.name || id;
    about = detail.about ?? "";
  } catch (error) {
    detailError = toUserFacingErrorMessage(error, "This group is unavailable.");
  }

  let messagesError = "";
  let notes: EventRecord[] = [];
  let missing: string[] = [];
  let authors: Record<string, Profile> = {};
  try {
    const payload = await getGroupMessages(host, id);
    const ids = (payload.messages ?? []).map((message) => message.event_id);
    const batch = ids.length > 0 ? await getEventsBatch(ids) : { events: [], missing: [] };
    const byId = new Map(
      batch.events.flatMap((event) => {
        const eventId = typeof event.id === "string" ? event.id.toLowerCase() : "";
        return eventId ? [[eventId, event] as const] : [];
      })
    );
    notes = ids.flatMap((eventId) => {
      const event = byId.get(eventId.toLowerCase());
      return event ? [event] : [];
    });
    missing = ids.filter((eventId) => !byId.has(eventId.toLowerCase()));
    if (notes.length > 0) {
      authors = await fetchProfilesByPubkey(extractEventAuthorPubkeys(notes), "shortTtl");
    }
  } catch (error) {
    messagesError = toUserFacingErrorMessage(error, "Group messages are unavailable.");
  }

  return (
    <div className="space-y-6">
      <PageHero
        eyebrow={host}
        title={name}
        subtitle={about || `Messages in this group on ${host}.`}
      />
      {detailError ? <ErrorPanel message={detailError} /> : null}
      {messagesError ? (
        <ErrorPanel message={messagesError} />
      ) : notes.length === 0 && missing.length === 0 ? (
        <EmptyState message="No messages are in the index for this group yet." />
      ) : (
        <div className="space-y-4">
          {notes.length > 0 ? <NotesList notes={notes} authorsByPubkey={authors} /> : null}
          {missing.length > 0 ? (
            <EmptyState
              message={`${missing.length.toLocaleString()} message ${missing.length === 1 ? "event is" : "events are"} listed but not in the index yet.`}
            />
          ) : null}
        </div>
      )}
    </div>
  );
}
