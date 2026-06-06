import { cardTierClassName } from "@/components/explorer/card-grammar";

/**
 * Loading placeholders that mirror the shape of the content they stand in for,
 * so navigation feels like the real layout is arriving rather than a void.
 * The shimmer + reduced-motion handling live in `globals.css` (`.nm-skeleton`).
 */

export function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden className={`nm-skeleton ${className}`.trim()} />;
}

function SkeletonLines({ widths }: { widths: string[] }) {
  return (
    <div className="space-y-2">
      {widths.map((width, index) => (
        <Skeleton key={index} className={`h-3.5 ${width}`} />
      ))}
    </div>
  );
}

export function NoteCardSkeleton() {
  return (
    <div className={cardTierClassName("standard")} aria-hidden>
      <div className="flex items-start gap-3">
        <Skeleton className="h-10 w-10 rounded-full sm:h-11 sm:w-11" />
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-3.5 w-2/5" />
          <Skeleton className="h-3 w-1/4" />
        </div>
      </div>
      <div className="mt-3.5">
        <SkeletonLines widths={["w-full", "w-11/12", "w-3/4"]} />
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Skeleton className="h-5 w-16 rounded-full" />
        <Skeleton className="h-5 w-20 rounded-full" />
        <Skeleton className="h-5 w-14 rounded-full" />
      </div>
    </div>
  );
}

export function ProfileCardSkeleton() {
  return (
    <div className={cardTierClassName("standard")} aria-hidden>
      <div className="flex items-start gap-3">
        <Skeleton className="h-10 w-10 rounded-full sm:h-11 sm:w-11" />
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-3 w-1/4" />
          <Skeleton className="h-3 w-3/4" />
        </div>
      </div>
      <div className="mt-3.5 flex flex-wrap gap-2">
        <Skeleton className="h-5 w-24 rounded-full" />
        <Skeleton className="h-5 w-20 rounded-full" />
      </div>
    </div>
  );
}

export function ChipSkeleton() {
  return (
    <div className="border-edge/85 bg-surface-sunken/35 rounded-xl border px-3 py-2.5" aria-hidden>
      <div className="flex items-center justify-between gap-3">
        <Skeleton className="h-3.5 w-1/2" />
        <Skeleton className="h-3.5 w-10" />
      </div>
    </div>
  );
}

export function PageHeroSkeleton() {
  return (
    <div
      className="border-edge/95 bg-surface/55 space-y-4 rounded-xl border p-4 sm:space-y-5 sm:p-6"
      aria-hidden
    >
      <div className="space-y-3">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-7 w-2/3 sm:h-8" />
        <Skeleton className="h-4 w-full max-w-xl" />
      </div>
      <div className="flex flex-wrap gap-2">
        <Skeleton className="h-6 w-20 rounded-full" />
        <Skeleton className="h-6 w-24 rounded-full" />
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>
    </div>
  );
}

export function NotesListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="min-w-0 space-y-3" aria-hidden>
      {Array.from({ length: count }).map((_, index) => (
        <NoteCardSkeleton key={index} />
      ))}
    </div>
  );
}

export function ProfilesListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3" aria-hidden>
      {Array.from({ length: count }).map((_, index) => (
        <ProfileCardSkeleton key={index} />
      ))}
    </div>
  );
}

export function ChipGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3" aria-hidden>
      {Array.from({ length: count }).map((_, index) => (
        <ChipSkeleton key={index} />
      ))}
    </div>
  );
}

export function StatGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-hidden>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="border-edge/85 bg-surface/45 space-y-2.5 rounded-xl border p-4">
          <Skeleton className="h-3 w-1/2" />
          <Skeleton className="h-6 w-2/3" />
        </div>
      ))}
    </div>
  );
}
