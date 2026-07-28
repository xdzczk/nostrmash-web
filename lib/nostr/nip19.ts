/**
 * NIP-19 bech32 entity encode/decode (npub, nsec, note, nprofile, nevent, naddr).
 * Reuses the same bech32 primitives as the existing npub helpers.
 */

const BECH32_CHARSET = "qpzry9x8gf2tvdw0s3jn54khce6mua7l";
const BECH32_GENERATOR = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3];

export type Nip19Decoded =
  | { type: "npub"; data: string }
  | { type: "nsec"; data: string }
  | { type: "note"; data: string }
  | { type: "nprofile"; data: { pubkey: string; relays?: string[] } }
  | { type: "nevent"; data: { id: string; relays?: string[]; author?: string; kind?: number } }
  | {
      type: "naddr";
      data: { identifier: string; pubkey: string; kind: number; relays?: string[] };
    };

function bech32Polymod(values: number[]): number {
  let checksum = 1;
  for (const value of values) {
    const top = checksum >> 25;
    checksum = ((checksum & 0x1ffffff) << 5) ^ value;
    for (let index = 0; index < 5; index += 1) {
      if ((top >> index) & 1) {
        checksum ^= BECH32_GENERATOR[index] ?? 0;
      }
    }
  }
  return checksum;
}

function bech32HrpExpand(hrp: string): number[] {
  const values: number[] = [];
  for (let index = 0; index < hrp.length; index += 1) {
    values.push(hrp.charCodeAt(index) >> 5);
  }
  values.push(0);
  for (let index = 0; index < hrp.length; index += 1) {
    values.push(hrp.charCodeAt(index) & 31);
  }
  return values;
}

function bech32VerifyChecksum(hrp: string, data: number[]): boolean {
  return bech32Polymod([...bech32HrpExpand(hrp), ...data]) === 1;
}

function bech32CreateChecksum(hrp: string, data: number[]): number[] {
  const values = [...bech32HrpExpand(hrp), ...data, 0, 0, 0, 0, 0, 0];
  const mod = bech32Polymod(values) ^ 1;
  const checksum: number[] = [];
  for (let index = 0; index < 6; index += 1) {
    checksum.push((mod >> (5 * (5 - index))) & 31);
  }
  return checksum;
}

function bech32Encode(hrp: string, data: number[]): string {
  const checksum = bech32CreateChecksum(hrp, data);
  const combined = [...data, ...checksum];
  const encoded = combined.map((value) => BECH32_CHARSET[value] ?? "").join("");
  return `${hrp}1${encoded}`;
}

function bech32Decode(value: string): { hrp: string; data: number[] } | null {
  if (!value || value.length < 8) return null;
  const lower = value.toLowerCase();
  const upper = value.toUpperCase();
  if (value !== lower && value !== upper) return null;

  const separatorIndex = lower.lastIndexOf("1");
  if (separatorIndex < 1 || separatorIndex + 7 > lower.length) return null;

  const hrp = lower.slice(0, separatorIndex);
  const dataPart = lower.slice(separatorIndex + 1);
  const data: number[] = [];
  for (const char of dataPart) {
    const index = BECH32_CHARSET.indexOf(char);
    if (index === -1) return null;
    data.push(index);
  }
  if (!bech32VerifyChecksum(hrp, data)) return null;

  return { hrp, data: data.slice(0, -6) };
}

function convertBits(
  data: number[],
  fromBits: number,
  toBits: number,
  pad: boolean
): number[] | null {
  let accumulator = 0;
  let bits = 0;
  const result: number[] = [];
  const maxValue = (1 << toBits) - 1;

  for (const value of data) {
    if (value < 0 || value >> fromBits !== 0) return null;
    accumulator = (accumulator << fromBits) | value;
    bits += fromBits;
    while (bits >= toBits) {
      bits -= toBits;
      result.push((accumulator >> bits) & maxValue);
    }
  }

  if (pad) {
    if (bits > 0) {
      result.push((accumulator << (toBits - bits)) & maxValue);
    }
  } else if (bits >= fromBits || ((accumulator << (toBits - bits)) & maxValue) !== 0) {
    return null;
  }

  return result;
}

function hexToBytes(hex: string): number[] | null {
  const normalized = hex.trim().toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(normalized)) return null;
  return Array.from({ length: normalized.length / 2 }, (_, index) =>
    Number.parseInt(normalized.slice(index * 2, index * 2 + 2), 16)
  );
}

function bytesToHex(bytes: number[]): string {
  return bytes.map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function encodeHexEntity(hrp: "npub" | "nsec" | "note", hex: string): string | null {
  const bytes = hexToBytes(hex);
  if (!bytes) return null;
  const words = convertBits(bytes, 8, 5, true);
  if (!words || words.length === 0) return null;
  return bech32Encode(hrp, words);
}

function decodeHexEntity(hrp: "npub" | "nsec" | "note", value: string): string | null {
  const decoded = bech32Decode(value.trim());
  if (!decoded || decoded.hrp !== hrp) return null;
  const bytes = convertBits(decoded.data, 5, 8, false);
  if (!bytes || bytes.length !== 32) return null;
  return bytesToHex(bytes);
}

type TlvEntry = { type: number; value: number[] };

function encodeTlv(entries: TlvEntry[]): number[] {
  const bytes: number[] = [];
  for (const entry of entries) {
    bytes.push(entry.type, entry.value.length, ...entry.value);
  }
  return bytes;
}

function decodeTlv(bytes: number[]): TlvEntry[] | null {
  const entries: TlvEntry[] = [];
  let index = 0;
  while (index < bytes.length) {
    if (index + 2 > bytes.length) return null;
    const type = bytes[index] ?? 0;
    const length = bytes[index + 1] ?? 0;
    index += 2;
    if (index + length > bytes.length) return null;
    entries.push({ type, value: bytes.slice(index, index + length) });
    index += length;
  }
  return entries;
}

function utf8Encode(value: string): number[] {
  return Array.from(new TextEncoder().encode(value));
}

function utf8Decode(bytes: number[]): string {
  return new TextDecoder().decode(Uint8Array.from(bytes));
}

function encodeInteger(value: number): number[] {
  return [(value >>> 24) & 0xff, (value >>> 16) & 0xff, (value >>> 8) & 0xff, value & 0xff];
}

function decodeInteger(bytes: number[]): number | null {
  if (bytes.length !== 4) return null;
  return (
    ((bytes[0] ?? 0) << 24) | ((bytes[1] ?? 0) << 16) | ((bytes[2] ?? 0) << 8) | (bytes[3] ?? 0)
  );
}

function encodeTlvEntity(hrp: "nprofile" | "nevent" | "naddr", entries: TlvEntry[]): string | null {
  const bytes = encodeTlv(entries);
  const words = convertBits(bytes, 8, 5, true);
  if (!words || words.length === 0) return null;
  return bech32Encode(hrp, words);
}

function decodeTlvEntity(hrp: "nprofile" | "nevent" | "naddr", value: string): TlvEntry[] | null {
  const decoded = bech32Decode(value.trim());
  if (!decoded || decoded.hrp !== hrp) return null;
  const bytes = convertBits(decoded.data, 5, 8, false);
  if (!bytes) return null;
  return decodeTlv(bytes);
}

export function npubToHex(npub: string): string | null {
  return decodeHexEntity("npub", npub);
}

export function hexToNpub(hex: string): string | null {
  return encodeHexEntity("npub", hex);
}

export function noteToHex(note: string): string | null {
  return decodeHexEntity("note", note);
}

export function hexToNote(hex: string): string | null {
  return encodeHexEntity("note", hex);
}

export function nsecToHex(nsec: string): string | null {
  return decodeHexEntity("nsec", nsec);
}

export function hexToNsec(hex: string): string | null {
  return encodeHexEntity("nsec", hex);
}

export function encodeNprofile(input: { pubkey: string; relays?: string[] }): string | null {
  const pubkey = hexToBytes(input.pubkey);
  if (!pubkey) return null;
  const entries: TlvEntry[] = [{ type: 0, value: pubkey }];
  for (const relay of input.relays ?? []) {
    entries.push({ type: 1, value: utf8Encode(relay) });
  }
  return encodeTlvEntity("nprofile", entries);
}

export function encodeNevent(input: {
  id: string;
  relays?: string[];
  author?: string;
  kind?: number;
}): string | null {
  const id = hexToBytes(input.id);
  if (!id) return null;
  const entries: TlvEntry[] = [{ type: 0, value: id }];
  for (const relay of input.relays ?? []) {
    entries.push({ type: 1, value: utf8Encode(relay) });
  }
  if (input.author) {
    const author = hexToBytes(input.author);
    if (!author) return null;
    entries.push({ type: 2, value: author });
  }
  if (typeof input.kind === "number") {
    entries.push({ type: 3, value: encodeInteger(input.kind >>> 0) });
  }
  return encodeTlvEntity("nevent", entries);
}

export function encodeNaddr(input: {
  identifier: string;
  pubkey: string;
  kind: number;
  relays?: string[];
}): string | null {
  const pubkey = hexToBytes(input.pubkey);
  if (!pubkey) return null;
  const entries: TlvEntry[] = [
    { type: 0, value: utf8Encode(input.identifier) },
    { type: 1, value: pubkey },
    { type: 2, value: encodeInteger(input.kind >>> 0) },
  ];
  for (const relay of input.relays ?? []) {
    entries.push({ type: 3, value: utf8Encode(relay) });
  }
  return encodeTlvEntity("naddr", entries);
}

export function decodeNip19(value: string): Nip19Decoded | null {
  const trimmed = value.trim().replace(/^nostr:/i, "");
  if (!trimmed) return null;

  const decoded = bech32Decode(trimmed);
  if (!decoded) return null;

  switch (decoded.hrp) {
    case "npub": {
      const hex = decodeHexEntity("npub", trimmed);
      return hex ? { type: "npub", data: hex } : null;
    }
    case "nsec": {
      const hex = decodeHexEntity("nsec", trimmed);
      return hex ? { type: "nsec", data: hex } : null;
    }
    case "note": {
      const hex = decodeHexEntity("note", trimmed);
      return hex ? { type: "note", data: hex } : null;
    }
    case "nprofile": {
      const entries = decodeTlvEntity("nprofile", trimmed);
      if (!entries) return null;
      let pubkey: string | undefined;
      const relays: string[] = [];
      for (const entry of entries) {
        if (entry.type === 0 && entry.value.length === 32) {
          pubkey = bytesToHex(entry.value);
        } else if (entry.type === 1) {
          relays.push(utf8Decode(entry.value));
        }
      }
      return pubkey
        ? { type: "nprofile", data: { pubkey, relays: relays.length ? relays : undefined } }
        : null;
    }
    case "nevent": {
      const entries = decodeTlvEntity("nevent", trimmed);
      if (!entries) return null;
      let id: string | undefined;
      let author: string | undefined;
      let kind: number | undefined;
      const relays: string[] = [];
      for (const entry of entries) {
        if (entry.type === 0 && entry.value.length === 32) {
          id = bytesToHex(entry.value);
        } else if (entry.type === 1) {
          relays.push(utf8Decode(entry.value));
        } else if (entry.type === 2 && entry.value.length === 32) {
          author = bytesToHex(entry.value);
        } else if (entry.type === 3) {
          const decodedKind = decodeInteger(entry.value);
          if (decodedKind !== null) kind = decodedKind >>> 0;
        }
      }
      return id
        ? {
            type: "nevent",
            data: {
              id,
              relays: relays.length ? relays : undefined,
              author,
              kind,
            },
          }
        : null;
    }
    case "naddr": {
      const entries = decodeTlvEntity("naddr", trimmed);
      if (!entries) return null;
      let identifier: string | undefined;
      let pubkey: string | undefined;
      let kind: number | undefined;
      const relays: string[] = [];
      for (const entry of entries) {
        if (entry.type === 0) {
          identifier = utf8Decode(entry.value);
        } else if (entry.type === 1 && entry.value.length === 32) {
          pubkey = bytesToHex(entry.value);
        } else if (entry.type === 2) {
          const decodedKind = decodeInteger(entry.value);
          if (decodedKind !== null) kind = decodedKind >>> 0;
        } else if (entry.type === 3) {
          relays.push(utf8Decode(entry.value));
        }
      }
      return identifier && pubkey && typeof kind === "number"
        ? {
            type: "naddr",
            data: {
              identifier,
              pubkey,
              kind,
              relays: relays.length ? relays : undefined,
            },
          }
        : null;
    }
    default:
      return null;
  }
}

/** Strip optional `nostr:` prefix and return the bech32 entity if valid. */
export function stripNostrPrefix(value: string): string {
  return value.trim().replace(/^nostr:/i, "");
}
