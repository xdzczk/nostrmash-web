import Link from "next/link";
import { EmptyState } from "@/components/explorer/empty-state";
import { buttonClassName } from "@/components/ui/button";

export default function NotFound() {
  return (
    <EmptyState
      title="Page not found"
      message="The signal ends here. Return to discovery or use the global search to find a note, person, topic, or relay."
      actions={
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Link href="/" className={buttonClassName({ variant: "primary" })}>
            Open Discover
          </Link>
          <Link href="/search" className={buttonClassName({ variant: "secondary" })}>
            Search
          </Link>
          <Link href="/relays" className={buttonClassName({ variant: "ghost" })}>
            Network
          </Link>
        </div>
      }
    />
  );
}
