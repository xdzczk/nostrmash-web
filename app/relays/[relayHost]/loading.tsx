import { ChipGridSkeleton, PageHeroSkeleton, StatGridSkeleton } from "@/components/ui/skeleton";

export default function RelayLoading() {
  return (
    <div className="space-y-7">
      <span className="sr-only" role="status">
        Loading relay explorer page
      </span>
      <PageHeroSkeleton />
      <StatGridSkeleton count={4} />
      <ChipGridSkeleton count={6} />
    </div>
  );
}
