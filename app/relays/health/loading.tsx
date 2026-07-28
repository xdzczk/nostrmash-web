import { PageHeroSkeleton, Skeleton } from "@/components/ui/skeleton";

export default function RelayHealthLoading() {
  return (
    <div className="space-y-7">
      <span className="sr-only" role="status">
        Loading relay health
      </span>
      <PageHeroSkeleton />
      <div className="space-y-2">
        {Array.from({ length: 8 }).map((_, index) => (
          <Skeleton key={index} className="h-16 w-full rounded-lg" />
        ))}
      </div>
    </div>
  );
}
