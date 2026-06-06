import { PageHeroSkeleton, StatGridSkeleton } from "@/components/ui/skeleton";

export default function StatsLoading() {
  return (
    <div className="space-y-7">
      <span className="sr-only" role="status">
        Loading analytics metrics
      </span>
      <PageHeroSkeleton />
      <StatGridSkeleton count={4} />
      <StatGridSkeleton count={4} />
    </div>
  );
}
