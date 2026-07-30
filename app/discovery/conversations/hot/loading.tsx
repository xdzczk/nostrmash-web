import { DiscoverCategorySkeleton } from "@/components/ui/skeleton";

export default function HotConversationsLoading() {
  return (
    <div>
      <span className="sr-only" role="status">
        Loading hot conversations
      </span>
      <DiscoverCategorySkeleton />
    </div>
  );
}
