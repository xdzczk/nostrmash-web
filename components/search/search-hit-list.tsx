import { NotesList } from "@/components/data/renderers";
import type { EventRecord, Profile } from "@/lib/types/api";

/** Search rows: two lines, no zero stats, no link cards, query terms marked. */
export async function SearchHitList({
  notes,
  authorsByPubkey,
  highlightTerms,
}: {
  notes: EventRecord[];
  authorsByPubkey?: Record<string, Profile>;
  highlightTerms?: string[];
}) {
  return (
    <NotesList
      notes={notes}
      authorsByPubkey={authorsByPubkey}
      compactMedia
      suppressEmbeds
      showUtilityLinks={false}
      omitZeroStats
      highlightTerms={highlightTerms}
    />
  );
}
