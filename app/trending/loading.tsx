import { DiscoverCategorySkeleton } from "@/components/ui/skeleton";

export default function TrendingLoading() {
  return (
    <div>
      <span className="sr-only" role="status">
        Loading trending explorer data
      </span>
      <DiscoverCategorySkeleton />
    </div>
  );
}
