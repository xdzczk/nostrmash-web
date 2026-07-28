import { NotesListSkeleton, PageHeroSkeleton } from "@/components/ui/skeleton";

export default function HotConversationsLoading() {
  return (
    <div className="space-y-7">
      <span className="sr-only" role="status">
        Loading hot conversations
      </span>
      <PageHeroSkeleton />
      <NotesListSkeleton count={5} />
    </div>
  );
}
