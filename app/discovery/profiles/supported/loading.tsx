import { DiscoverCategorySkeleton } from "@/components/ui/skeleton";

export default function MostSupportedProfilesLoading() {
  return (
    <div>
      <span className="sr-only" role="status">
        Loading most supported profiles
      </span>
      <DiscoverCategorySkeleton />
    </div>
  );
}
