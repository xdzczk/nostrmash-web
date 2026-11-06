import Link from "@/components/app-link";

import { ProfileAvatar } from "@/components/explorer/profile-avatar";
import { profileLabel, profileSecondaryLabel } from "@/components/explorer/utils";
import { normalizeRelayHost } from "@/components/explorer/stats-utils";
import { RelayLink } from "@/components/relays/relay-link";
import { hexToNpub, npubToHex } from "@/lib/nostr/nip19";
import { kindFilterHref, kindInfo } from "@/lib/nostr/kind-names";
import type { Profile } from "@/lib/types/api";

function hexPubkey(value: string): string | null {
  const trimmed = value.trim();
  if (/^[0-9a-fA-F]{64}$/.test(trimmed)) return trimmed.toLowerCase();
  if (trimmed.startsWith("npub1")) return npubToHex(trimmed);
  return null;
}

function shortNpub(hex: string): string {
  const npub = hexToNpub(hex);
  if (!npub) return "Profile";
  return `${npub.slice(0, 8)}…${npub.slice(-4)}`;
}

/** Avatar, name, and NIP-05. A missing profile shows a shortened npub, never hex. */
export function ProfileChip({ pubkey, profile }: { pubkey: string; profile?: Profile | null }) {
  const hex = hexPubkey(pubkey);
  const href = hex ? `/profiles/${hex}` : `/profiles/${encodeURIComponent(pubkey.trim())}`;
  const shown: Profile = profile ?? {
    pubkey: hex ?? "0".repeat(64),
    display_name: hex ? shortNpub(hex) : "Profile",
  };
  const name = profile ? profileLabel(profile) : (shown.display_name ?? "Profile");
  const secondary = profile ? profileSecondaryLabel(profile) : null;
  return (
    <Link href={href} className="inline-flex min-w-0 items-center gap-2">
      <ProfileAvatar profile={shown} size={28} />
      <span className="min-w-0">
        <span className="text-ink block truncate text-sm">{name}</span>
        {secondary ? (
          <span className="text-ink-faint block truncate text-xs">{secondary}</span>
        ) : null}
      </span>
    </Link>
  );
}

export function KindChip({ kind }: { kind: number }) {
  const info = kindInfo(kind);
  const href = kindFilterHref(kind);
  const body = info.known ? (
    <>
      {info.name} <span className="text-ink-faint">(kind {kind})</span>
    </>
  ) : (
    <>Kind {kind}</>
  );
  const className = "text-ink text-sm";
  if (!href) {
    return (
      <span className={className} title={info.nip ? `NIP-${info.nip}` : undefined}>
        {body}
      </span>
    );
  }
  return (
    <Link
      href={href}
      className={`${className} hover:text-link`}
      title={info.nip ? `NIP-${info.nip}` : undefined}
    >
      {body}
    </Link>
  );
}

export function HashtagChip({ tag }: { tag: string }) {
  const clean = tag.replace(/^#/, "").trim();
  if (!clean) return null;
  return (
    <Link href={`/hashtags/${encodeURIComponent(clean)}`} className="text-link text-sm">
      #{clean}
    </Link>
  );
}

export function RelayChip({ url }: { url: string }) {
  const host = normalizeRelayHost(url) ?? url;
  return <RelayLink host={host} label={host} />;
}
