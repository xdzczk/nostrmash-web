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
    <div className="border-edge/70 space-y-5 border-b pt-8 pb-10 sm:pt-12 sm:pb-12" aria-hidden>
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

export function DiscoverOverviewSkeleton() {
  return (
    <div className="space-y-10" aria-hidden>
      <PageHeroSkeleton />
      <Skeleton className="h-11 w-full rounded-none" />
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1.42fr)_minmax(300px,0.62fr)] lg:gap-14">
        <div className="border-edge/70 space-y-5 border-l-2 pl-6 sm:pl-8">
          <Skeleton className="h-10 w-12" />
          <div className="flex items-center gap-3">
            <Skeleton className="h-11 w-11 rounded-full" />
            <Skeleton className="h-4 w-32" />
          </div>
          <SkeletonLines widths={["w-full", "w-11/12", "w-4/5", "w-2/3"]} />
          <Skeleton className="h-4 w-52" />
        </div>
        <div className="space-y-6">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="border-edge/70 space-y-3 border-t pt-5">
              <Skeleton className="h-6 w-10" />
              <SkeletonLines widths={["w-full", "w-4/5", "w-2/3"]} />
            </div>
          ))}
        </div>
      </div>
      <div className="grid gap-12 lg:grid-cols-[minmax(0,1.2fr)_minmax(300px,0.72fr)]">
        <ProfilesListSkeleton count={4} />
        <div className="space-y-4">
          <Skeleton className="h-6 w-40" />
          <SkeletonLines widths={["w-full", "w-5/6", "w-3/4", "w-2/3"]} />
        </div>
      </div>
    </div>
  );
}

export function DiscoverCategorySkeleton() {
  return (
    <div className="space-y-8" aria-hidden>
      <PageHeroSkeleton />
      <Skeleton className="h-11 w-full rounded-none" />
      <div className="border-edge/70 border-t pt-6">
        <Skeleton className="mb-5 h-7 w-48" />
        <NotesListSkeleton count={5} />
      </div>
    </div>
  );
}
