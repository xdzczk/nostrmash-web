import { NotesListSkeleton, PageHeroSkeleton } from "@/components/ui/skeleton";

export default function TrendingLoading() {
  return (
    <div className="space-y-7">
      <span className="sr-only" role="status">
        Loading trending explorer data
      </span>
      <PageHeroSkeleton />
      <NotesListSkeleton count={5} />
    </div>
  );
}
