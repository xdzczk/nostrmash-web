import { DiscoverCategorySkeleton } from "@/components/ui/skeleton";

export default function MostFollowedProfilesLoading() {
  return (
    <div>
      <span className="sr-only" role="status">
        Loading most followed profiles
      </span>
      <DiscoverCategorySkeleton />
    </div>
  );
}
