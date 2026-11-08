/** Relabel a network-wide stat when the homepage is scoped to one language. */
export function languageScopedStatLabel(label: string): string {
  if (label.startsWith("note_volume_")) return label.replace("note_volume_", "language_notes_");
  if (label.startsWith("active_authors_")) {
    return label.replace("active_authors_", "language_authors_");
  }
  return label;
}

/** Display name for a language-scoped pulse tile. Null for every other label. */
export function languageScopedMetricLabel(label: string): string | null {
  const notes = /^language_notes_(24h|7d|30d)$/.exec(label);
  if (notes?.[1]) return `Notes in this language (${notes[1]})`;
  const authors = /^language_authors_(24h|7d|30d)$/.exec(label);
  if (authors?.[1]) return `Authors in this language (${authors[1]})`;
  return null;
}
