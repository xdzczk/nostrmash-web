import { sanitizeExternalHref } from "@/components/explorer/utils";
import { decodeNip19, hexToNpub } from "@/lib/nostr/nip19";
import { buildProfileActivityTabHref } from "@/lib/profile/activity-tabs";

/** Turn a markdown/NIP-23 href into a safe internal or http(s) URL. */
export function markdownHref(raw: string | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const decoded = decodeNip19(trimmed);
  if (decoded) {
    switch (decoded.type) {
      case "npub":
        return `/profiles/${encodeURIComponent(hexToNpub(decoded.data) ?? decoded.data)}`;
      case "nprofile":
        return `/profiles/${encodeURIComponent(
          hexToNpub(decoded.data.pubkey) ?? decoded.data.pubkey
        )}`;
      case "note":
        return `/notes/${encodeURIComponent(decoded.data)}`;
      case "nevent":
        return `/notes/${encodeURIComponent(decoded.data.id)}`;
      case "naddr":
        return buildProfileActivityTabHref(
          `/profiles/${encodeURIComponent(hexToNpub(decoded.data.pubkey) ?? decoded.data.pubkey)}`,
          new URLSearchParams(),
          "long_form"
        );
      default:
        return null;
    }
  }

  return sanitizeExternalHref(trimmed);
}
