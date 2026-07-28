import { PageHeroSkeleton, Skeleton, StatGridSkeleton } from "@/components/ui/skeleton";

export default function ProbeHealthLoading() {
  return (
    <div className="space-y-7">
      <span className="sr-only" role="status">
        Loading probe health
      </span>
      <PageHeroSkeleton />
      <StatGridSkeleton count={4} />
      <div className="space-y-2">
        {Array.from({ length: 8 }).map((_, index) => (
          <Skeleton key={index} className="h-20 w-full rounded-lg" />
        ))}
      </div>
    </div>
  );
}
