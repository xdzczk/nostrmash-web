import { PageHeroSkeleton, ProfilesListSkeleton } from "@/components/ui/skeleton";

export default function RisingProfilesLoading() {
  return (
    <div className="space-y-7">
      <span className="sr-only" role="status">
        Loading rising profiles
      </span>
      <PageHeroSkeleton />
      <ProfilesListSkeleton count={5} />
    </div>
  );
}
