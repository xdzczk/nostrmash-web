import { DiscoverCategorySkeleton } from "@/components/ui/skeleton";

export default function RisingProfilesLoading() {
  return (
    <div>
      <span className="sr-only" role="status">
        Loading rising profiles
      </span>
      <DiscoverCategorySkeleton />
    </div>
  );
}
