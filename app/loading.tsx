import { NotesListSkeleton, PageHeroSkeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-7">
      <span className="sr-only" role="status">
        Loading explorer data
      </span>
      <PageHeroSkeleton />
      <NotesListSkeleton count={4} />
    </div>
  );
}
