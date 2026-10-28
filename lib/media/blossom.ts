/**
 * Public Blossom servers tried, in order, after the URL stored in an event
 * fails. Blobs are named by sha256, so any server that replicated the file can
 * serve it. The author's URL stays first: a fresh upload often exists only there.
 * Kept short so a missing file costs a few fast 404s, not a fan-out.
 */
export const BLOSSOM_MIRRORS = [
  "https://blossom.primal.net",
  "https://image.nostr.build",
  "https://blossom.band",
] as const;

const BLOB_SEGMENT = /^([a-f0-9]{64})(\.[a-z0-9]{1,8})?$/i;

export type BlossomBlob = {
  hash: string;
  /** Leading dot, or empty when the URL has no extension. */
  ext: string;
};

/** A URL whose last path segment is a Blossom sha256, with an optional short extension. */
export function parseBlossomBlob(value: string): BlossomBlob | null {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  const segment = url.pathname.split("/").filter(Boolean).at(-1);
  if (!segment) return null;
  const match = BLOB_SEGMENT.exec(segment);
  const hash = match?.[1];
  if (!hash) return null;
  return { hash: hash.toLowerCase(), ext: (match[2] ?? "").toLowerCase() };
}

function candidateKey(value: string): string {
  try {
    const url = new URL(value);
    return `${url.origin}${url.pathname}${url.search}`.toLowerCase();
  } catch {
    return value.toLowerCase();
  }
}

/** Original URL first, then mirror URLs for the same hash. Non-blobs return just the original. */
export function blossomCandidateUrls(original: string): string[] {
  const blob = parseBlossomBlob(original);
  if (!blob) return [original];
  const mirrors = BLOSSOM_MIRRORS.map((base) => `${base}/${blob.hash}${blob.ext}`);
  const seen = new Set<string>();
  const urls: string[] = [];
  for (const url of [original, ...mirrors]) {
    const key = candidateKey(url);
    if (seen.has(key)) continue;
    seen.add(key);
    urls.push(url);
  }
  return urls;
}

export type BlossomImageSnapshot = {
  failed: ReadonlySet<string>;
  resolved: ReadonlyMap<string, string>;
};

/**
 * Next URL to show for `original`. `failed` means every candidate has already
 * errored; `src` is then the last candidate so a caller can keep or replace it.
 */
export function selectBlossomImageSrc(
  original: string | null,
  snapshot: BlossomImageSnapshot
): { src: string | null; failed: boolean } {
  if (!original) return { src: null, failed: false };

  const blob = parseBlossomBlob(original);
  if (!blob) {
    return { src: original, failed: snapshot.failed.has(original) };
  }

  const resolved = snapshot.resolved.get(blob.hash);
  if (resolved && !snapshot.failed.has(resolved)) {
    return { src: resolved, failed: false };
  }

  const candidates = blossomCandidateUrls(original);
  const next = candidates.find((url) => !snapshot.failed.has(url));
  if (next) return { src: next, failed: false };
  return { src: candidates.at(-1) ?? original, failed: true };
}
