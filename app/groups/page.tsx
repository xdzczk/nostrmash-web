import type { Metadata } from "next";
import Link from "@/components/app-link";

import { GroupList } from "@/components/explorer/group-list";
import { PageHero } from "@/components/explorer/page-hero";
import { ErrorPanel } from "@/components/ui/status-panels";
import { getGroups } from "@/lib/api/endpoints";
import { toUserFacingErrorMessage } from "@/lib/errors/user-message";
import { readSearchParam } from "@/lib/search-params/pagination";
import { buildEntityMetadata } from "@/lib/seo/metadata";
import type { GroupSort } from "@/lib/types/surfaces";

export const metadata: Metadata = buildEntityMetadata({
  title: "Groups",
  description: "Relay groups ordered by recent activity, membership, or the latest message.",
  path: "/groups",
});

const SORTS: Array<{ id: GroupSort; label: string }> = [
  { id: "active", label: "Active" },
  { id: "members", label: "Members" },
  { id: "recent", label: "Recent" },
];

function readSort(value: string | undefined): GroupSort {
  if (value === "members" || value === "recent" || value === "active") return value;
  return "active";
}

export default async function GroupsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolved = await searchParams;
  const sort = readSort(readSearchParam(resolved, "sort"));
  let groups: Awaited<ReturnType<typeof getGroups>>["groups"] = [];
  let errorMessage = "";
  try {
    groups = (await getGroups(sort)).groups ?? [];
  } catch (error) {
    errorMessage = toUserFacingErrorMessage(error, "Groups are unavailable.");
  }

  return (
    <div className="space-y-6">
      <PageHero
        eyebrow="Groups"
        title="Relay groups"
        subtitle="Public groups indexed from NIP-29 metadata and recent messages."
        badges={
          <nav aria-label="Group sort" className="flex gap-3 text-sm">
            {SORTS.map((entry) => (
              <Link
                key={entry.id}
                href={entry.id === "active" ? "/groups" : `/groups?sort=${entry.id}`}
                aria-current={sort === entry.id ? "page" : undefined}
                className={sort === entry.id ? "text-ink" : "text-link"}
              >
                {entry.label}
              </Link>
            ))}
          </nav>
        }
      />
      {errorMessage ? (
        <ErrorPanel message={errorMessage} retryHref="/groups" />
      ) : (
        <GroupList groups={groups} />
      )}
    </div>
  );
}
