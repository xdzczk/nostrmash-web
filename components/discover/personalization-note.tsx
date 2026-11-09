import {
  personalizationNotice,
  readPersonalization,
  viewerCohortDegraded,
} from "@/lib/discover/personalization";

export function PersonalizationNote({
  payload,
  scope = "list",
}: {
  payload: unknown;
  scope?: "list" | "home";
}) {
  const text = personalizationNotice(readPersonalization(payload), {
    degraded: viewerCohortDegraded(payload),
    scope,
  });
  if (!text) return null;
  return <p className="text-ink-soft max-w-3xl text-sm leading-6">{text}</p>;
}
