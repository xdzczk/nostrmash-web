import { TabBar } from "@/components/ui/tabs";
import { PROFILE_ACTIVITY_TABS, type ProfileActivityTab } from "@/lib/profile/activity-tabs";

export function ProfileActivityTabs({
  activeTab,
  tabs,
}: {
  activeTab: ProfileActivityTab;
  tabs: Array<{ id: ProfileActivityTab; label: string; href: string }>;
}) {
  const items = tabs.map((tab) => ({
    key: tab.id,
    label: PROFILE_ACTIVITY_TABS.find((entry) => entry.id === tab.id)?.label ?? tab.label,
    href: tab.href,
    active: tab.id === activeTab,
  }));

  return <TabBar ariaLabel="Profile activity" items={items} />;
}
