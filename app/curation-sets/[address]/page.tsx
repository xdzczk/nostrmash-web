import type { Metadata } from "next";
import Link from "@/components/app-link";
import { notFound } from "next/navigation";

import { EmptyState } from "@/components/explorer/empty-state";
import { PageHero } from "@/components/explorer/page-hero";
import { ErrorPanel } from "@/components/ui/status-panels";
import { getCurationSet } from "@/lib/api/endpoints";
import { toUserFacingErrorMessage } from "@/lib/errors/user-message";
import { decodeRouteParam } from "@/lib/routing/params";
import { buildEntityMetadata } from "@/lib/seo/metadata";
import type { CurationSetItem } from "@/lib/types/surfaces";

type Params = Promise<{ address: string }>;

function itemHref(item: CurationSetItem): string | null {
  if (item.type === "e" && /^[0-9a-f]{64}$/i.test(item.value)) {
    return `/notes/${item.value.toLowerCase()}`;
  }
  if (item.type !== "a") return null;
  const kind = item.value.split(":")[0];
  if (kind === "30009") return `/badges/${encodeURIComponent(item.value)}`;
  if (kind === "30004" || kind === "30005")
    return `/curation-sets/${encodeURIComponent(item.value)}`;
  return null;
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const address = decodeRouteParam((await params).address);
  return buildEntityMetadata({
    title: "Curation set",
    description: "Items in a public curation set.",
    path: `/curation-sets/${encodeURIComponent(address)}`,
  });
}

export default async function CurationSetPage({ params }: { params: Params }) {
  const address = decodeRouteParam((await params).address);
  if (!address.includes(":")) notFound();
  let title = address;
  let description = "";
  let items: CurationSetItem[] = [];
  let errorMessage = "";
  try {
    const set = await getCurationSet(address);
    title = set.title || address;
    description = set.description ?? "";
    items = set.items ?? [];
  } catch (error) {
    errorMessage = toUserFacingErrorMessage(error, "This curation set is unavailable.");
  }

  return (
    <div className="space-y-6">
      <PageHero eyebrow="Curation set" title={title} subtitle={description || undefined} />
      {errorMessage ? (
        <ErrorPanel message={errorMessage} />
      ) : items.length === 0 ? (
        <EmptyState message="This set has no items in the index yet." />
      ) : (
        <ul className="divide-edge/70 divide-y">
          {items.map((item) => {
            const href = itemHref(item);
            return (
              <li key={`${item.type}-${item.value}`} className="py-2 text-sm break-all">
                {href ? (
                  <Link href={href} className="text-link">
                    {item.value}
                  </Link>
                ) : (
                  <span className="text-ink-soft">{item.value}</span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
