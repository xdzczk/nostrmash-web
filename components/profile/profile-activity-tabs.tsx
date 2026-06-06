import Link from "next/link";

import { PROFILE_ACTIVITY_TABS, type ProfileActivityTab } from "@/lib/profile/activity-tabs";

export function ProfileActivityTabs({
  activeTab,
  tabs,
}: {
  activeTab: ProfileActivityTab;
  tabs: Array<{ id: ProfileActivityTab; label: string; href: string }>;
}) {
  return (
    <nav className="rounded-xl border border-zinc-800 bg-zinc-900/45 p-1">
      <ul className="flex flex-wrap gap-1">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab;
          const tabMeta = PROFILE_ACTIVITY_TABS.find((entry) => entry.id === tab.id);
          return (
            <li key={tab.id}>
              <Link
                href={tab.href}
                className={`inline-flex items-center rounded-lg px-3 py-1.5 text-sm transition ${
                  isActive
                    ? "bg-zinc-200/90 text-zinc-950"
                    : "text-zinc-300 hover:bg-zinc-800/60 hover:text-zinc-100"
                }`}
              >
                {tabMeta?.label ?? tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
