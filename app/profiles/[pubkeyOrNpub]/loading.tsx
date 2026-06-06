import { NotesListSkeleton, PageHeroSkeleton } from "@/components/ui/skeleton";

export default function ProfileLoading() {
  return (
    <div className="space-y-7">
      <span className="sr-only" role="status">
        Loading profile
      </span>
      <PageHeroSkeleton />
      <NotesListSkeleton count={4} />
    </div>
  );
}
