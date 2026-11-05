import type { Metadata } from "next";
import Link from "@/components/app-link";

import { EmptyState } from "@/components/explorer/empty-state";
import { PageHero } from "@/components/explorer/page-hero";
import { ErrorPanel } from "@/components/ui/status-panels";
import { getCurationSets } from "@/lib/api/endpoints";
import { toUserFacingErrorMessage } from "@/lib/errors/user-message";
import { buildEntityMetadata } from "@/lib/seo/metadata";
import { listKindLabel } from "@/lib/stats/surface-display";

export const metadata: Metadata = buildEntityMetadata({
  title: "Curation sets",
  description: "Public article and bookmark curation sets.",
  path: "/curation-sets",
});

export default async function CurationSetsPage() {
  let sets: Awaited<ReturnType<typeof getCurationSets>>["curation_sets"] = [];
  let errorMessage = "";
  try {
    sets = (await getCurationSets()).curation_sets ?? [];
  } catch (error) {
    errorMessage = toUserFacingErrorMessage(error, "Curation sets are unavailable.");
  }

  return (
    <div className="space-y-6">
      <PageHero
        eyebrow="Lists"
        title="Curation sets"
        subtitle="Kind 30004 and 30005 lists of articles and bookmarks."
      />
      {errorMessage ? (
        <ErrorPanel message={errorMessage} retryHref="/curation-sets" />
      ) : sets.length === 0 ? (
        <EmptyState message="No curation sets are in the index yet." />
      ) : (
        <ul className="divide-edge/70 divide-y">
          {sets.map((set) => (
            <li key={set.address} className="py-3">
              <Link
                href={`/curation-sets/${encodeURIComponent(set.address)}`}
                className="text-ink hover:text-link text-sm font-medium"
              >
                {set.title || set.address}
              </Link>
              <p className="text-ink-muted mt-1 text-xs">
                {listKindLabel(set.kind)}
                {typeof set.item_count === "number"
                  ? ` · ${set.item_count.toLocaleString()} items`
                  : ""}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
