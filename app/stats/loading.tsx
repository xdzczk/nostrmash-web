import { Skeleton } from "@/components/ui/skeleton";

export default function StatsLoading() {
  return (
    <div className="space-y-8">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-12 w-2/3" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
      <div className="grid [grid-template-columns:repeat(auto-fit,minmax(12.5rem,1fr))] gap-3">
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
      </div>
      <Skeleton className="h-48 w-full" />
    </div>
  );
}
