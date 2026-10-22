const HEX_ID = /^[a-f0-9]{64}$/i;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Outbound notes this event actually points at: a quote tag, an `e` mention,
 * or `reference_event_id`. Thread markers and hex ids buried in quote activity
 * (pubkeys, people who quoted this note) are not references.
 */
export function referencedNoteIds(
  event: { tags?: unknown } | null | undefined,
  context: unknown,
  selfId: string
): string[] {
  const self = selfId.toLowerCase();
  const ids: string[] = [];
  const seen = new Set<string>();
  const add = (value: unknown) => {
    if (typeof value !== "string" || !HEX_ID.test(value)) return;
    const id = value.toLowerCase();
    if (id === self || seen.has(id)) return;
    seen.add(id);
    ids.push(id);
  };

  if (isRecord(context)) add(context.reference_event_id);

  const tags = Array.isArray(event?.tags) ? event.tags : [];
  for (const tag of tags) {
    if (!Array.isArray(tag) || tag[0] !== "q") continue;
    add(tag[1]);
  }
  for (const tag of tags) {
    if (!Array.isArray(tag) || tag[0] !== "e") continue;
    const marker = typeof tag[3] === "string" ? tag[3].toLowerCase() : "";
    if (marker !== "mention") continue;
    add(tag[1]);
  }
  return ids;
}
