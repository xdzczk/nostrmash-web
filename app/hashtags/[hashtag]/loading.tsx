import { NotesListSkeleton, PageHeroSkeleton, StatGridSkeleton } from "@/components/ui/skeleton";

export default function HashtagLoading() {
  return (
    <div className="space-y-7">
      <span className="sr-only" role="status">
        Loading hashtag explorer
      </span>
      <PageHeroSkeleton />
      <StatGridSkeleton count={3} />
      <NotesListSkeleton count={4} />
    </div>
  );
}
