import { PageHeroSkeleton, Skeleton, StatGridSkeleton } from "@/components/ui/skeleton";

export default function PopularRelaysLoading() {
  return (
    <div className="space-y-7">
      <span className="sr-only" role="status">
        Loading popular relays
      </span>
      <PageHeroSkeleton />
      <StatGridSkeleton count={4} />
      <div className="space-y-2">
        {Array.from({ length: 8 }).map((_, index) => (
          <Skeleton key={index} className="h-16 w-full rounded-lg" />
        ))}
      </div>
    </div>
  );
}
