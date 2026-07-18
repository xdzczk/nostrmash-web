const HASHTAG_LOOKUP_PATTERN = /^[a-z0-9][a-z0-9_-]{0,63}$/;

/** Normalize + validate hashtag for API lookup (matches NostrMash backend rules). */
export function normalizeHashtagQuery(hashtag: string): string {
  const normalized = hashtag.trim().replace(/^#/, "").trim().toLowerCase();
  if (!normalized || !HASHTAG_LOOKUP_PATTERN.test(normalized)) {
    throw new Error(`API 400: invalid hashtag "${hashtag.trim()}"`);
  }
  return normalized;
}

export function isValidHashtag(hashtag: string): boolean {
  try {
    normalizeHashtagQuery(hashtag);
    return true;
  } catch {
    return false;
  }
}
