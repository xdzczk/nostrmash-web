function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function highlightTermsForQuery(query: string): string[] {
  const stripped = query.trim().replace(/^["“]|["”]$/g, "");
  const terms = stripped
    .split(/\s+/)
    .map((term) => term.replace(/^#/, "").replace(/^["“]|["”]$/g, ""))
    .filter((term) => term.length >= 2);
  return [...new Set(terms)];
}

/** Split text into matched and unmatched runs. Terms shorter than 2 characters are ignored. */
export function splitHighlight(
  value: string,
  terms: string[]
): Array<{ text: string; match: boolean }> {
  const unique = [
    ...new Set(terms.map((term) => term.trim()).filter((term) => term.length >= 2)),
  ].sort((a, b) => b.length - a.length);
  if (!unique.length || value.length === 0) return [{ text: value, match: false }];

  const pattern = new RegExp(`(${unique.map(escapeRegExp).join("|")})`, "gi");
  const parts: Array<{ text: string; match: boolean }> = [];
  let last = 0;
  for (const match of value.matchAll(pattern)) {
    const index = match.index ?? 0;
    if (index > last) parts.push({ text: value.slice(last, index), match: false });
    if (match[0].length > 0) parts.push({ text: match[0], match: true });
    last = index + match[0].length;
  }
  if (last < value.length) parts.push({ text: value.slice(last), match: false });
  return parts.length > 0 ? parts : [{ text: value, match: false }];
}
