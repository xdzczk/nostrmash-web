import { TabBar } from "@/components/ui/tabs";

export type NetworkView = "overview" | "relays" | "health" | "stats";

const NETWORK_VIEWS = [
  { key: "overview", label: "Overview", href: "/relays" },
  { key: "relays", label: "Popular relays", href: "/relays/popular" },
  { key: "health", label: "Health", href: "/relays/health" },
  { key: "stats", label: "Statistics", href: "/stats" },
] as const;

export function NetworkNav({ active }: { active: NetworkView }) {
  return (
    <TabBar
      ariaLabel="Network categories"
      items={NETWORK_VIEWS.map((view) => ({ ...view, active: view.key === active }))}
    />
  );
}
