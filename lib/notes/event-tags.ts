/** String-only tag rows. Numeric tag values are coerced; anything else is dropped. */
export function eventTagRows(tags: unknown): string[][] {
  if (!Array.isArray(tags)) return [];
  const rows: string[][] = [];
  for (const tag of tags) {
    if (!Array.isArray(tag) || tag.length === 0) continue;
    const parts: string[] = [];
    let valid = true;
    for (const part of tag) {
      if (typeof part === "string") parts.push(part);
      else if (typeof part === "number" && Number.isFinite(part)) parts.push(String(part));
      else {
        valid = false;
        break;
      }
    }
    if (valid && parts.length > 0) rows.push(parts);
  }
  return rows;
}

export function firstTagValue(
  tags: unknown,
  name: string,
  options?: { caseSensitive?: boolean }
): string | undefined {
  const expect = options?.caseSensitive ? name : name.toLowerCase();
  for (const tag of eventTagRows(tags)) {
    const label = tag[0] ?? "";
    const matches = options?.caseSensitive ? label === expect : label.toLowerCase() === expect;
    const value = tag[1]?.trim();
    if (matches && value) return value;
  }
  return undefined;
}

export function tagValues(tags: unknown, name: string): string[] {
  const expect = name.toLowerCase();
  const values: string[] = [];
  for (const tag of eventTagRows(tags)) {
    if ((tag[0] ?? "").toLowerCase() !== expect) continue;
    const value = tag[1]?.trim();
    if (value) values.push(value);
  }
  return values;
}

const ADDRESS = /^(\d+):([0-9a-f]{64}):([\s\S]+)$/i;

export type AddressCoordinate = {
  kind: number;
  pubkey: string;
  identifier: string;
};

/** NIP-33 `kind:pubkey:d` coordinate from an `a` tag. */
export function parseAddressCoordinate(value: string | undefined): AddressCoordinate | null {
  if (!value) return null;
  const match = ADDRESS.exec(value.trim());
  if (!match) return null;
  const kind = Number(match[1]);
  const pubkey = match[2]?.toLowerCase();
  const identifier = match[3]?.trim();
  if (!Number.isInteger(kind) || !pubkey || !identifier) return null;
  return { kind, pubkey, identifier };
}
