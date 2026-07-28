import Link from "next/link";
import { EmptyState } from "@/components/explorer/empty-state";
import { buttonClassName } from "@/components/ui/button";

export default function NotFound() {
  return (
    <EmptyState
      title="Page not found"
      message="That URL is not part of the explorer. Try search, trends, or head back home."
      actions={
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Link href="/" className={buttonClassName({ variant: "primary" })}>
            Home
          </Link>
          <Link href="/search" className={buttonClassName({ variant: "secondary" })}>
            Search
          </Link>
          <Link href="/trending" className={buttonClassName({ variant: "ghost" })}>
            Trends
          </Link>
        </div>
      }
    />
  );
}
