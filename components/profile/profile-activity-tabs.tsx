import type { ReactNode } from "react";

import { ProfileActivityTabBar } from "@/components/profile/profile-activity-tab-bar";
import type { TabItem } from "@/components/ui/tab-styles";
import {
  PROFILE_ACTIVITY_TABS,
  isSecondaryProfileActivityTab,
  type ProfileActivityTab,
} from "@/lib/profile/activity-tabs";

export function ProfileActivityTabs({
  activeTab,
  tabs,
  children,
}: {
  activeTab: ProfileActivityTab;
  tabs: Array<{ id: ProfileActivityTab; label: string; href: string }>;
  /** Server-rendered panel for the active tab. */
  children: ReactNode;
}) {
  const primary: TabItem[] = [];
  const secondary: TabItem[] = [];
  for (const tab of tabs) {
    const item: TabItem = {
      key: tab.id,
      label: PROFILE_ACTIVITY_TABS.find((entry) => entry.id === tab.id)?.label ?? tab.label,
      href: tab.href,
      active: tab.id === activeTab,
    };
    (isSecondaryProfileActivityTab(tab.id) ? secondary : primary).push(item);
  }

  return (
    <ProfileActivityTabBar
      ariaLabel="Profile activity"
      activeKey={activeTab}
      items={primary}
      overflow={secondary.length > 0 ? { label: "More", items: secondary } : undefined}
    >
      {children}
    </ProfileActivityTabBar>
  );
}
