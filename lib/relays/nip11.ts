import { normalizeRelayHost } from "@/components/explorer/stats-utils";
import type {
  Nip11Document,
  Nip11Fee,
  Nip11Fees,
  Nip11Info,
  Nip11Kind,
  Nip11RetentionRule,
} from "@/lib/types/api";

const ELLIPSIS = "…";
const HEX_PUBKEY = /^[0-9a-f]{64}$/;

export type RelayPublishedRow = {
  id: string;
  label: string;
  text?: string;
  lines?: string[];
  href?: string;
  external?: boolean;
  wide?: boolean;
};

export function relayWebsocketUrl(relay: string | undefined, host: string): string {
  if (relay && /^wss?:\/\//i.test(relay.trim())) return relay.trim();
  return `wss://${host}`;
}

/**
 * Registry lookup URL for a relay page. Prefer the popular row for this host,
 * then the probe row, then the ingest checkpoint or `wss://<host>`.
 */
export function chooseRelayInfoUrl(input: {
  popularUrl?: string | null;
  probeUrl?: string | null;
  healthRelay?: string | null;
  host: string;
}): string {
  const popular = input.popularUrl?.trim();
  if (popular) return popular;
  const probe = input.probeUrl?.trim();
  if (probe) return probe;
  return relayWebsocketUrl(input.healthRelay ?? undefined, input.host);
}

export function relayInfoUrlForHost(input: {
  host: string;
  popularUrls?: Array<string | null | undefined>;
  probeUrls?: Array<string | null | undefined>;
  healthRelay?: string | null;
}): string {
  const popularUrl = firstUrlForHost(input.popularUrls, input.host);
  const probeUrl = firstUrlForHost(input.probeUrls, input.host);
  return chooseRelayInfoUrl({
    popularUrl,
    probeUrl,
    healthRelay: input.healthRelay,
    host: input.host,
  });
}

function firstUrlForHost(
  urls: Array<string | null | undefined> | undefined,
  host: string
): string | undefined {
  const match = urls?.find((url) => typeof url === "string" && normalizeRelayHost(url) === host);
  return typeof match === "string" ? match : undefined;
}

/** Absolute http(s) URL with no credentials. Other values are not rendered. */
export function httpUrl(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    if (!url.hostname || url.username || url.password) return null;
    return trimmed;
  } catch {
    return null;
  }
}

export function publishedText(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export type PublishedRelayMark = {
  name: string;
  iconSrc?: string;
};

/** Name and icon from a stored NIP-11 document. An icon is kept only as an http(s) URL. */
export function publishedRelayMark(relay: {
  name?: string | null;
  icon?: string | null;
}): PublishedRelayMark | undefined {
  const name = publishedText(relay.name);
  if (!name) return undefined;
  const iconSrc = httpUrl(relay.icon) ?? undefined;
  return iconSrc ? { name, iconSrc } : { name };
}

/**
 * First published name for each host. Later rows for the same host stay unused,
 * so a more-listed URL wins when the caller passes relays in rank order.
 */
export function publishedRelayMarksByHost(
  relays:
    | Array<{ normalized_url?: string | null; name?: string | null; icon?: string | null }>
    | null
    | undefined
): Map<string, PublishedRelayMark> {
  const marks = new Map<string, PublishedRelayMark>();
  for (const relay of relays ?? []) {
    const host = normalizeRelayHost(relay.normalized_url ?? "");
    const mark = publishedRelayMark(relay);
    if (!host || !mark || marks.has(host)) continue;
    marks.set(host, mark);
  }
  return marks;
}

/** Host moves into the detail line when the row label is the published name. */
export function relayRankingDetail(
  host: string,
  name: string | undefined,
  parts: Array<string | null | undefined>
): string {
  return [name ? host : null, ...parts].filter((part): part is string => Boolean(part)).join(" · ");
}

export function withPublishedNames(
  description: string,
  show: boolean,
  ranking: "listed" | "indexed"
): string {
  if (!show) return description;
  const basis = ranking === "listed" ? "how many people list it" : "indexed event volume";
  return `${description} Names are what each relay publishes about itself, separate from ${basis}.`;
}

/** The NIP-11 object when the last fetch succeeded. */
export function publishedInfo(nip11: Nip11Document | null | undefined): Nip11Info | null {
  if (!nip11?.ok || !nip11.info) return null;
  return nip11.info;
}

export function relayDocumentTitle(host: string, name: string | null | undefined): string {
  const publishedName = publishedText(name);
  if (!publishedName) return host;
  return `${publishedName} · ${host}`;
}

export function relayMetaDescription(host: string, description?: string | null): string {
  const published = publishedText(description);
  if (!published) {
    return `Indexed rank, listed rank, and current status for the Nostr relay ${host}.`;
  }
  return singleLineText(published, 160);
}

/** Collapse whitespace onto one line, then truncate on a word boundary. */
export function singleLineText(value: string, maxLength = 160): string {
  const line = value.replace(/\s+/g, " ").trim();
  if (line.length <= maxLength) return line;
  const room = Math.max(1, maxLength - ELLIPSIS.length);
  const slice = line.slice(0, room + 1);
  const lastBreak = slice.lastIndexOf(" ");
  const head = (lastBreak > room * 0.6 ? slice.slice(0, lastBreak) : line.slice(0, room))
    .replace(/[\s,;:.!?…-]+$/u, "")
    .trimEnd();
  const trimmedHead = head.length > 0 ? head : line.slice(0, room).trimEnd();
  return `${trimmedHead}${ELLIPSIS}`;
}

export function relayPublishedTitle(name: string | null | undefined): string {
  return publishedText(name) ?? "About this relay";
}

export function nip11FailureMessage(error: string | undefined): string {
  if (error === "http_404" || error === "not_json") {
    return "This relay does not publish a description.";
  }
  return "The relay description could not be read.";
}

export function publishedInfoRows(info: Nip11Info | null | undefined): RelayPublishedRow[] {
  if (!info) return [];
  const rows: RelayPublishedRow[] = [];

  const description = publishedText(info.description);
  if (description) {
    rows.push({ id: "description", label: "Description", text: description, wide: true });
  }

  const software = publishedText(info.software);
  if (software) {
    const href = httpUrl(software);
    rows.push({
      id: "software",
      label: "Software",
      text: software,
      href: href ?? undefined,
      external: Boolean(href),
    });
  }

  const version = publishedText(info.version);
  if (version) rows.push({ id: "version", label: "Version", text: version });

  const contact = publishedText(info.contact);
  if (contact) rows.push({ id: "contact", label: "Contact", text: contact });

  const pubkey = publishedText(info.pubkey)?.toLowerCase();
  if (pubkey && HEX_PUBKEY.test(pubkey)) {
    rows.push({
      id: "pubkey",
      label: "Public key",
      text: pubkey,
      href: `/profiles/${pubkey}`,
    });
  }

  const nips = formatSupportedNips(info.supported_nips);
  if (nips) rows.push({ id: "nips", label: "Supported NIPs", text: nips, wide: true });

  const limitation = info.limitation;
  if (typeof limitation?.auth_required === "boolean") {
    rows.push({
      id: "auth",
      label: "Authentication",
      text: limitation.auth_required ? "Required" : "Not required",
    });
  }
  if (typeof limitation?.payment_required === "boolean") {
    rows.push({
      id: "payment",
      label: "Payment",
      text: limitation.payment_required ? "Required" : "Not required",
    });
  }

  const fees = formatFeeLines(info.fees);
  if (fees.length > 0) rows.push({ id: "fees", label: "Fees", lines: fees, wide: true });

  const retention = formatRetentionLines(info.retention);
  if (retention.length > 0) {
    rows.push({ id: "retention", label: "Retention", lines: retention, wide: true });
  }

  return rows;
}

export function formatSupportedNips(nips: number[] | undefined): string | null {
  if (!nips || nips.length === 0) return null;
  const unique = [...new Set(nips.filter((nip) => Number.isInteger(nip) && nip >= 0))].sort(
    (left, right) => left - right
  );
  if (unique.length === 0) return null;
  return unique
    .map((nip) => `NIP-${nip < 100 ? String(nip).padStart(2, "0") : String(nip)}`)
    .join(", ");
}

export function formatPublishedDuration(seconds: number): string {
  const whole = Math.trunc(seconds);
  if (whole <= 0) return "0 seconds";
  const units = [
    [86_400, "day"],
    [3_600, "hour"],
    [60, "minute"],
  ] as const;
  for (const [size, name] of units) {
    if (whole % size === 0) {
      const count = whole / size;
      return `${count.toLocaleString()} ${name}${count === 1 ? "" : "s"}`;
    }
  }
  return `${whole.toLocaleString()} ${whole === 1 ? "second" : "seconds"}`;
}

const FEE_GROUPS = [
  ["admission", "Admission"],
  ["subscription", "Subscription"],
  ["publication", "Publication"],
] as const satisfies ReadonlyArray<readonly [keyof Nip11Fees, string]>;

function formatFeeLines(fees: Nip11Fees | undefined): string[] {
  if (!fees) return [];
  const lines: string[] = [];
  for (const [key, label] of FEE_GROUPS) {
    for (const fee of fees[key] ?? []) {
      const line = formatFeeLine(label, fee);
      if (line) lines.push(line);
    }
  }
  return lines;
}

function formatFeeLine(label: string, fee: Nip11Fee): string | null {
  if (typeof fee.amount !== "number" || !Number.isFinite(fee.amount)) return null;
  const unit = fee.unit?.trim();
  if (!unit) return null;
  const parts = [`${label} · ${fee.amount.toLocaleString()} ${unit}`];
  if (typeof fee.period === "number" && Number.isFinite(fee.period) && fee.period >= 0) {
    parts.push(formatPublishedDuration(fee.period));
  }
  const kinds = (fee.kinds ?? []).filter((kind) => Number.isInteger(kind) && kind >= 0);
  if (kinds.length > 0) parts.push(`kinds ${kinds.join(", ")}`);
  return parts.join(" · ");
}

function formatRetentionLines(rules: Nip11RetentionRule[] | undefined): string[] {
  if (!rules) return [];
  const lines: string[] = [];
  for (const rule of rules) {
    const parts: string[] = [];
    const kinds = formatKindSpecs(rule.kinds);
    if (kinds) parts.push(`kinds ${kinds}`);
    if (typeof rule.time === "number" && Number.isFinite(rule.time) && rule.time >= 0) {
      parts.push(formatPublishedDuration(rule.time));
    }
    if (typeof rule.count === "number" && Number.isFinite(rule.count) && rule.count >= 0) {
      const count = Math.trunc(rule.count);
      parts.push(`${count.toLocaleString()} ${count === 1 ? "event" : "events"}`);
    }
    if (parts.length > 0) lines.push(parts.join(" · "));
  }
  return lines;
}

function formatKindSpecs(kinds: Nip11Kind[] | undefined): string | null {
  if (!kinds || kinds.length === 0) return null;
  const labels = kinds
    .map((kind) => {
      if (typeof kind === "number" && Number.isInteger(kind) && kind >= 0) return String(kind);
      if (
        Array.isArray(kind) &&
        kind.length === 2 &&
        kind.every((value) => typeof value === "number" && Number.isInteger(value) && value >= 0) &&
        kind[1] >= kind[0]
      ) {
        return `${kind[0]}–${kind[1]}`;
      }
      return null;
    })
    .filter((label): label is string => label !== null);
  if (labels.length === 0) return null;
  return labels.join(", ");
}
