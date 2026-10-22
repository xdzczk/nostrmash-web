import Link from "next/link";

import { sanitizeExternalHref, truncateMiddle } from "@/components/explorer/utils";
import { Pill } from "@/components/ui/pill";
import { formatTrustTier, lastActiveLabel } from "@/lib/profile/hero-signals";
import type { ProfileField, TrustSummary } from "@/lib/types/api";

const NPUB_PATTERN = /^npub1[02-9ac-hj-np-z]{58}$/i;
const MAX_FIELD_VALUE = 40;

function FieldValue({ value }: { value: string }) {
  const trimmed = value.trim();
  if (NPUB_PATTERN.test(trimmed)) {
    return (
      <Link
        href={`/profiles/${encodeURIComponent(trimmed)}`}
        className="text-link hover:text-link-hover font-mono"
        title={trimmed}
      >
        {truncateMiddle(trimmed, 20)}
      </Link>
    );
  }
  const href = /^https?:\/\//i.test(trimmed) ? sanitizeExternalHref(trimmed) : null;
  if (href) {
    const display = trimmed.replace(/^https?:\/\//i, "").replace(/\/$/, "");
    return (
      <a
        href={href}
        rel="noopener noreferrer nofollow"
        target="_blank"
        className="text-link hover:text-link-hover"
        title={trimmed}
      >
        {truncateMiddle(display, MAX_FIELD_VALUE)}
      </a>
    );
  }
  return (
    <span className="text-ink-soft" title={trimmed}>
      {truncateMiddle(trimmed, MAX_FIELD_VALUE)}
    </span>
  );
}

/**
 * Compact row of profile signals under the hero: trust tier, recency, bot flag
 * and any custom profile fields the account published. Renders nothing when no
 * signal is available so the hero never shows an empty strip.
 */
export function ProfileHeroSignals({
  trust,
  recentActivityAt,
  nowMs,
  bot,
  fields,
  maxFields = 3,
  className = "",
}: {
  trust?: TrustSummary | null;
  recentActivityAt?: unknown;
  nowMs: number;
  bot?: boolean;
  fields?: ProfileField[];
  /** Hero shows a few fields; the rest belong in the identity disclosure. */
  maxFields?: number;
  className?: string;
}) {
  const trustLabel = formatTrustTier(trust);
  const activeLabel = lastActiveLabel(recentActivityAt, nowMs);
  const visibleFields = (fields ?? []).slice(0, maxFields);
  const hasSignals = Boolean(trustLabel || activeLabel || bot || visibleFields.length > 0);
  if (!hasSignals) return null;

  return (
    <ul
      aria-label="Profile signals"
      className={`flex flex-wrap items-center gap-2 ${className}`.trim()}
      data-testid="profile-hero-signals"
    >
      {trustLabel ? (
        <li>
          <Pill
            tone="entity"
            href="/methodology#trust"
            title="Web-of-trust distance from seed accounts. Learn how trust tiers work."
          >
            <span className="text-ink-faint mr-1.5 font-normal">Trust</span>
            {trustLabel.label}
          </Pill>
        </li>
      ) : null}
      {activeLabel ? (
        <li>
          <Pill tone="freshness">{activeLabel}</Pill>
        </li>
      ) : null}
      {bot ? (
        <li>
          <Pill
            tone="neutral"
            title="This account declares itself automated in its profile metadata."
          >
            Bot
          </Pill>
        </li>
      ) : null}
      {visibleFields.map(([label, value], index) => (
        <li key={`${label}-${index}`}>
          <Pill tone="stat" className="gap-1.5">
            <span className="text-ink-faint font-normal">{truncateMiddle(label, 24)}</span>
            <FieldValue value={value} />
          </Pill>
        </li>
      ))}
    </ul>
  );
}
