import type { Metadata } from "next";

import { OverviewAsymmetricMock } from "@/components/discover/prototypes/overview-asymmetric-mock";

export const metadata: Metadata = {
  title: "Overview asymmetric mock",
  description:
    "Static layout mock for the NostrMash overview. Wide lead, narrow rails. Fixture data, not live rankings.",
  robots: { index: false, follow: false },
};

export default function OverviewAsymmetricPage() {
  return <OverviewAsymmetricMock />;
}
