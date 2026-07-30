import { DiscoverOverviewSkeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div>
      <span className="sr-only" role="status">
        Loading Discover overview
      </span>
      <DiscoverOverviewSkeleton />
    </div>
  );
}
