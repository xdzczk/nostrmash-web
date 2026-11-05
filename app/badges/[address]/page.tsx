import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { BadgeDefinition } from "@/components/profile/profile-surfaces";
import { PageHero } from "@/components/explorer/page-hero";
import { ErrorPanel } from "@/components/ui/status-panels";
import { getBadge } from "@/lib/api/endpoints";
import { toUserFacingErrorMessage } from "@/lib/errors/user-message";
import { decodeRouteParam } from "@/lib/routing/params";
import { buildEntityMetadata } from "@/lib/seo/metadata";

type Params = Promise<{ address: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const address = decodeRouteParam((await params).address);
  return buildEntityMetadata({
    title: "Badge",
    description: "A badge definition and how many times it has been awarded.",
    path: `/badges/${encodeURIComponent(address)}`,
  });
}

export default async function BadgePage({ params }: { params: Params }) {
  const address = decodeRouteParam((await params).address);
  if (!address.includes(":")) notFound();
  let errorMessage = "";
  let badge: Awaited<ReturnType<typeof getBadge>> | null = null;
  try {
    badge = await getBadge(address);
  } catch (error) {
    errorMessage = toUserFacingErrorMessage(error, "This badge is unavailable.");
  }

  return (
    <div className="space-y-6">
      <PageHero eyebrow="Badge" title={badge?.name || "Badge"} subtitle={badge?.description} />
      {errorMessage ? (
        <ErrorPanel message={errorMessage} />
      ) : (
        <BadgeDefinition
          name={badge?.name}
          description={badge?.description}
          image={badge?.image}
          awards={badge?.awards}
          issuer={badge?.issuer}
        />
      )}
    </div>
  );
}
