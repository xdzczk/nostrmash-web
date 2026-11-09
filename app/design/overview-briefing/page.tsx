import type { Metadata } from "next";

import { OverviewBriefingMock } from "@/components/discover/prototypes/overview-briefing-mock";

export const metadata: Metadata = {
  title: "Overview briefing mock",
  description: "Static layout mock for the NostrMash overview. Fixture data, not live rankings.",
  robots: { index: false, follow: false },
};

export default function OverviewBriefingPage() {
  return <OverviewBriefingMock />;
}
