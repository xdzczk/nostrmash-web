import Link from "@/components/app-link";

import { EmptyState } from "@/components/explorer/empty-state";
import { normalizeRelayHost } from "@/components/explorer/stats-utils";
import type { GroupSummary } from "@/lib/types/surfaces";

export function groupHref(group: Pick<GroupSummary, "relay_url" | "group_id">): string | null {
  const host = normalizeRelayHost(group.relay_url);
  if (!host || !group.group_id) return null;
  return `/groups/${encodeURIComponent(host)}/${encodeURIComponent(group.group_id)}`;
}

export function GroupList({ groups }: { groups: GroupSummary[] }) {
  if (groups.length === 0) {
    return <EmptyState message="No groups are in the index yet." />;
  }
  return (
    <ul className="divide-edge/70 divide-y">
      {groups.map((group) => {
        const href = groupHref(group);
        const title = group.name || group.group_id;
        return (
          <li key={`${group.relay_url}-${group.group_id}`} className="py-3">
            {href ? (
              <Link href={href} className="text-ink hover:text-link text-sm font-medium">
                {title}
              </Link>
            ) : (
              <p className="text-ink text-sm font-medium">{title}</p>
            )}
            <p className="text-ink-muted mt-1 text-xs break-all">
              {normalizeRelayHost(group.relay_url) || group.relay_url}
              {typeof group.member_count === "number"
                ? ` · ${group.member_count.toLocaleString()} members`
                : ""}
              {typeof group.messages_7d === "number"
                ? ` · ${group.messages_7d.toLocaleString()} messages in 7 days`
                : ""}
              {group.is_public === false ? " · private" : ""}
              {group.is_open === false ? " · closed" : ""}
            </p>
            {group.about ? <p className="text-ink-soft mt-1 text-sm">{group.about}</p> : null}
          </li>
        );
      })}
    </ul>
  );
}
