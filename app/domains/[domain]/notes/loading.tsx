import { NotesListSkeleton, PageHeroSkeleton } from "@/components/ui/skeleton";

export default function DomainNotesLoading() {
  return (
    <div className="space-y-7">
      <span className="sr-only" role="status">
        Loading domain notes
      </span>
      <PageHeroSkeleton />
      <NotesListSkeleton count={6} />
    </div>
  );
}
