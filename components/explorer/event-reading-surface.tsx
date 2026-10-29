import type { ReactNode } from "react";

import { EventKindSwitch } from "@/components/explorer/event-kind-switch";
import type { NoteCardDensity } from "@/components/explorer/note-card";
import type { NoteContentResolution } from "@/components/explorer/note-content";
import type { EventRecord, Profile } from "@/lib/types/api";

/** Full reading surface. Kind selects the card; kind 1111 and 1984 stay off this page. */
export function EventReadingSurface({
  event,
  author,
  contentResolution,
  density = "detail",
  priorityMedia = false,
  repostsControl,
  connectAbove = false,
  connectBelow = false,
  bridgeToNote = false,
}: {
  event: EventRecord;
  author?: Profile;
  contentResolution?: NoteContentResolution;
  density?: Exclude<NoteCardDensity, "list">;
  priorityMedia?: boolean;
  /** Replaces the Reposts stat on the focal note. */
  repostsControl?: ReactNode;
  /** Continue a thread line down from the note above. */
  connectAbove?: boolean;
  /** Draw the line through this note's avatar gutter, beside its text. */
  connectBelow?: boolean;
  /** Carry that line across the gap to the open note's avatar. */
  bridgeToNote?: boolean;
}) {
  return (
    <EventKindSwitch
      event={event}
      author={author}
      surface={density === "reply" ? "reply" : "detail"}
      contentResolution={contentResolution}
      priorityMedia={priorityMedia}
      repostsControl={repostsControl}
      connectAbove={connectAbove}
      connectBelow={connectBelow}
      bridgeToNote={bridgeToNote}
      showUtilityLinks={false}
    />
  );
}
