import { NoteCardSkeleton, NotesListSkeleton } from "@/components/ui/skeleton";

export default function NoteLoading() {
  return (
    <div className="space-y-7">
      <span className="sr-only" role="status">
        Loading note and thread context
      </span>
      <NoteCardSkeleton />
      <NotesListSkeleton count={3} />
    </div>
  );
}
