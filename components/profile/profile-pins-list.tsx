import Link from "next/link";

import { EventKindSwitch } from "@/components/explorer/event-kind-switch";
import { isHiddenNoteKind } from "@/lib/api/normalize";
import { parseAddressCoordinate } from "@/lib/notes/event-tags";
import { hexToNpub } from "@/lib/nostr/nip19";
import { buildProfileActivityTabHref, type ProfileActivityTab } from "@/lib/profile/activity-tabs";
import type { EventRecord, PinItem, Profile } from "@/lib/types/api";

function addressTab(kind: number): ProfileActivityTab {
  if (kind === 30023) return "long_form";
  if (kind === 30311) return "live";
  if (kind === 20 || kind === 21 || kind === 22 || kind === 34235 || kind === 34236) return "media";
  return "notes";
}

function profileTabHref(pubkey: string, kind: number): string {
  const identifier = hexToNpub(pubkey) ?? pubkey;
  return buildProfileActivityTabHref(
    `/profiles/${encodeURIComponent(identifier)}`,
    new URLSearchParams(),
    addressTab(kind)
  );
}

export function ProfilePinsList({
  pins,
  eventsById,
  authorsByPubkey,
}: {
  pins: PinItem[];
  eventsById: Record<string, EventRecord>;
  authorsByPubkey?: Record<string, Profile>;
}) {
  return (
    <ol className="divide-edge/60 min-w-0 divide-y">
      {pins.map((pin, index) => {
        const key = `${pin.tag}:${pin.value}:${index}`;
        if (pin.tag === "e") {
          const event = eventsById[pin.value] ?? eventsById[pin.value.toLowerCase()];
          if (event && !isHiddenNoteKind(event)) {
            const author =
              typeof event.pubkey === "string"
                ? (authorsByPubkey?.[event.pubkey.toLowerCase()] ?? authorsByPubkey?.[event.pubkey])
                : undefined;
            return (
              <li key={key} className="min-w-0 py-2">
                <EventKindSwitch
                  event={event}
                  author={author}
                  surface="list"
                  showUtilityLinks={false}
                  profilesByPubkey={authorsByPubkey}
                />
              </li>
            );
          }
          return (
            <li key={key} className="px-1 py-4 text-sm">
              <p className="text-ink-dim">This pinned note is not in the index yet.</p>
              <Link
                href={`/notes/${encodeURIComponent(pin.value)}`}
                className="text-link hover:text-link-hover mt-1 inline-flex min-h-6 items-center"
              >
                Open note
              </Link>
            </li>
          );
        }

        const coordinate = parseAddressCoordinate(pin.value);
        return (
          <li key={key} className="px-1 py-4 text-sm">
            <p className="text-ink-dim">Pinned addressable event</p>
            {coordinate ? (
              <Link
                href={profileTabHref(coordinate.pubkey, coordinate.kind)}
                className="text-link hover:text-link-hover mt-1 inline-flex min-h-6 items-center break-all"
              >
                {coordinate.kind}:{coordinate.pubkey.slice(0, 8)}…:{coordinate.identifier}
              </Link>
            ) : (
              <p className="text-ink-faint mt-1 break-all">{pin.value}</p>
            )}
          </li>
        );
      })}
    </ol>
  );
}
