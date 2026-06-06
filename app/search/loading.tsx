import { NotesListSkeleton, PageHeroSkeleton } from "@/components/ui/skeleton";

export default function SearchLoading() {
  return (
    <div className="space-y-7">
      <span className="sr-only" role="status">
        Loading search results
      </span>
      <PageHeroSkeleton />
      <NotesListSkeleton count={5} />
    </div>
  );
}
