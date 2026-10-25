import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { CopyValueButton } from "@/components/actions/copy-value-button";
import { EntityActions } from "@/components/actions/entity-actions";
import { DebugDisclosure } from "@/components/explorer/debug-disclosure";
import { EntityContextNav } from "@/components/discover/entity-context-nav";
import { EmptyState } from "@/components/explorer/empty-state";
import { IdBadge } from "@/components/explorer/id-badge";
import { AboutThisData } from "@/components/explorer/about-this-data";
import { ProfileAvatar } from "@/components/explorer/profile-avatar";
import { RichInlineText } from "@/components/explorer/note-content";
import { NotFoundState } from "@/components/layout/not-found-state";
import {
  isRecord,
  normalizeImageSrc,
  profileLabel,
  sanitizeExternalHref,
  truncateIdentifier,
  truncateMiddle,
} from "@/components/explorer/utils";
import {
  DeferredProfileActivity,
  DeferredProfileDiscovery,
} from "@/components/profile/deferred-profile-sections";
import { ProfileCover } from "@/components/profile/profile-banner-backdrop";
import { ProfileHeroSignals } from "@/components/profile/profile-hero-signals";
import { JsonLd } from "@/components/seo/json-ld";
import { Disclosure } from "@/components/ui/disclosure";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorPanel, SoftRefreshNote } from "@/components/ui/status-panels";
import { isApiError } from "@/lib/api/errors";
import { hexToNpub } from "@/lib/nostr/nip19";
import { formatNip05, formatUnixDate } from "@/lib/profile/hero-signals";
import {
  getProfileSummaryCached,
  loadProfileFocalData,
} from "@/lib/profile/load-profile-page-data";
import { isValidPubkeyOrNpubParam, resolvePubkeyParam } from "@/lib/routing/params";
import { absoluteUrl, buildEntityMetadata } from "@/lib/seo/metadata";
import { getRequestNowMs } from "@/lib/time/request-now";
import type { Profile, ProfileStats } from "@/lib/types/api";

type Params = Promise<{ pubkeyOrNpub: string }>;
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

type MetadataPrimitiveValue = {
  raw?: string;
  display?: string;
  copyable?: boolean;
  truncated?: boolean;
};

type HeroAction = {
  id: string;
  label: string;
  href: string;
};

function asMetadataPrimitiveValue(value: unknown): MetadataPrimitiveValue | null {
  if (!isRecord(value)) return null;
  const raw = typeof value.raw === "string" ? value.raw : undefined;
  const display = typeof value.display === "string" ? value.display : undefined;
  const copyable = typeof value.copyable === "boolean" ? value.copyable : undefined;
  const truncated = typeof value.truncated === "boolean" ? value.truncated : undefined;
  if (!raw && !display) return null;
  return { raw, display, copyable, truncated };
}

/**
 * The summary's `hero.actions` currently point at API routes (`/api/v1/...`),
 * which are not pages on this site. Only absolute external links are kept;
 * in-app shortcuts are rendered by the page itself (tabs, EntityActions).
 */
function normalizeHeroActions(value: unknown): HeroAction[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => {
      if (!isRecord(entry)) return null;
      const id = typeof entry.id === "string" ? entry.id : "";
      const label = typeof entry.label === "string" ? entry.label : "";
      const rawHref = typeof entry.href === "string" ? entry.href.trim() : "";
      const href = /^https?:\/\//i.test(rawHref) ? sanitizeExternalHref(rawHref) : null;
      if (!label || !href) return null;
      return {
        id: id || label.toLowerCase().replace(/\s+/g, "_"),
        label,
        href,
      } satisfies HeroAction;
    })
    .filter((entry): entry is HeroAction => Boolean(entry))
    .filter((entry) => entry.id !== "rising_profiles" && entry.label !== "Up and coming");
}

function toCounterRows(
  stats: ProfileStats | undefined
): Array<{ key: string; label: string; value: number }> {
  if (!stats) return [];
  const rows = [
    { key: "follower_count", label: "Followers", value: stats.follower_count },
    { key: "following_count", label: "Following", value: stats.following_count },
    { key: "note_count", label: "Notes", value: stats.note_count },
    { key: "reply_count", label: "Replies", value: stats.reply_count },
  ];
  return rows.filter(
    (row): row is { key: string; label: string; value: number } => typeof row.value === "number"
  );
}

function fallbackIdentityDetails(
  profile: Profile | null,
  summary: Record<string, unknown> | null
): Array<{ key: string; label: string; value: MetadataPrimitiveValue }> {
  if (!profile) return [];
  const rows: Array<{ key: string; label: string; value: MetadataPrimitiveValue }> = [];
  const push = (key: string, label: string, raw: unknown, max = 56) => {
    if (typeof raw !== "string" || raw.trim().length === 0) return;
    const value = raw.trim();
    const display = value.length > max ? `${value.slice(0, max - 1).trimEnd()}…` : value;
    rows.push({
      key,
      label,
      value: { raw: value, display, copyable: true, truncated: display !== value },
    });
  };
  push("npub", "Npub", profile.npub);
  push("pubkey", "Pubkey", profile.pubkey);
  push("nip05", "NIP-05", profile.nip05);
  push("website", "Website", profile.website);
  push("lud16", "LUD-16", profile.lud16);
  push("about", "About", profile.about, 120);
  push("metadata_event_id", "Metadata event", summary?.metadata_event_id);
  const createdAt = summary?.metadata_created_at;
  if (typeof createdAt === "number" || typeof createdAt === "string") {
    push("metadata_created_at", "Metadata created at", String(createdAt));
  }
  return rows;
}

type IdentityDetailRow = { key: string; label: string; value: MetadataPrimitiveValue };

/** Keys and labels already visible in the hero (name, bio, website, Lightning, NIP-05). */
const HERO_DUPLICATE_IDENTITY_KEYS = new Set([
  "npub_or_pubkey",
  "npub",
  "pubkey",
  "about",
  "name",
  "display_name",
  "displayname",
  "nip05",
  "nip_05",
  "website",
  "lud16",
  "lud_16",
  "lightning",
  "lnurl",
]);
const HERO_DUPLICATE_IDENTITY_LABELS = new Set([
  "display name",
  "name",
  "about",
  "nip-05",
  "website",
  "lud-16",
  "lightning",
]);

/**
 * Drop fields the hero already shows and turn raw unix timestamps into a
 * readable date (the raw value stays available via `title` and copy).
 */
function appendOverflowProfileFields(
  rows: IdentityDetailRow[],
  fields: Array<[string, string]>
): IdentityDetailRow[] {
  if (fields.length === 0) return rows;
  const seen = new Set(rows.map((row) => row.label.trim().toLowerCase()));
  const extra = fields.flatMap(([label, value]): IdentityDetailRow[] => {
    const key = label.trim().toLowerCase();
    if (!key || seen.has(key)) return [];
    seen.add(key);
    return [
      {
        key: `field:${key}`,
        label,
        value: { raw: value, display: value, copyable: true },
      },
    ];
  });
  return extra.length > 0 ? [...rows, ...extra] : rows;
}

function presentIdentityDetails(rows: IdentityDetailRow[]): IdentityDetailRow[] {
  const seen = new Set<string>();
  const result: IdentityDetailRow[] = [];
  for (const row of rows) {
    const key = row.key.toLowerCase();
    const labelKey = row.label.trim().toLowerCase();
    if (
      HERO_DUPLICATE_IDENTITY_KEYS.has(key) ||
      HERO_DUPLICATE_IDENTITY_LABELS.has(labelKey) ||
      seen.has(key)
    ) {
      continue;
    }
    seen.add(key);
    if (key === "metadata_created_at") {
      const iso = formatUnixDate(row.value.raw ?? row.value.display);
      result.push({
        ...row,
        label: "Metadata updated",
        value: {
          ...row.value,
          display: iso ?? row.value.display,
          copyable: true,
        },
      });
      continue;
    }
    result.push(row);
  }
  return result;
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { pubkeyOrNpub } = await params;
  if (!isValidPubkeyOrNpubParam(pubkeyOrNpub)) {
    return {
      title: "Profile not found",
      description: "This profile identifier is invalid.",
    };
  }
  const resolved = resolvePubkeyParam(pubkeyOrNpub) ?? pubkeyOrNpub;
  try {
    const summary = await getProfileSummaryCached(pubkeyOrNpub);
    const profile = summary.profile ?? (summary as unknown as Profile);
    const label =
      profile.display_name ?? profile.name ?? profile.npub ?? profile.pubkey ?? pubkeyOrNpub;
    return buildEntityMetadata({
      title: String(label),
      description: `View profile activity, notes, and network context for ${label}.`,
      path: `/profiles/${encodeURIComponent(pubkeyOrNpub)}`,
      imagePath: `/profiles/${encodeURIComponent(pubkeyOrNpub)}/opengraph-image`,
      type: "profile",
      rss: {
        url: `/feeds/profiles/${encodeURIComponent(pubkeyOrNpub)}/xml`,
        title: `${label} notes`,
      },
    });
  } catch (error) {
    if (isApiError(error) && error.isNotFound) {
      return {
        title: "Profile not found",
        description: "This profile is not in the NostrMash index.",
        robots: { index: false, follow: false },
      };
    }
    return buildEntityMetadata({
      title: `Profile ${truncateMiddle(resolved, 24)}`,
      description: `View profile activity, notes, and network context for ${pubkeyOrNpub}.`,
      path: `/profiles/${encodeURIComponent(pubkeyOrNpub)}`,
      type: "profile",
      rss: {
        url: `/feeds/profiles/${encodeURIComponent(pubkeyOrNpub)}/xml`,
        title: "Profile notes",
      },
    });
  }
}

export default async function ProfilePage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { pubkeyOrNpub } = await params;
  if (!isValidPubkeyOrNpubParam(pubkeyOrNpub)) {
    return <NotFoundState />;
  }
  const resolvedSearchParams = await searchParams;
  const {
    contentResolution,
    errorMessage,
    lookupKey,
    profile,
    profileEnrichment,
    profileRoute,
    semantics,
    summary,
    summaryRecord,
    notFound: profileNotFound,
  } = await loadProfileFocalData(pubkeyOrNpub);
  if (profileNotFound) {
    // Before any Suspense boundary, so the response is a real 404.
    notFound();
  }

  const hero = isRecord(summaryRecord?.hero) ? summaryRecord.hero : null;
  const heroMetadata = isRecord(hero?.metadata) ? hero.metadata : null;
  const heroCounters = toCounterRows(
    (isRecord(hero?.counters) ? hero.counters : summary?.stats) as ProfileStats
  );
  const externalHeroActions = normalizeHeroActions(hero?.actions);
  const nowMs = getRequestNowMs();
  const trustSummary = summary?.trust_summary ?? null;
  const recentActivityAt = summary?.stats?.recent_activity_at;
  const bannerSrc = normalizeImageSrc(profile?.banner);

  const heroNpubOrPubkey =
    asMetadataPrimitiveValue(heroMetadata?.npub_or_pubkey) ??
    (profile?.npub
      ? { raw: profile.npub, display: profile.npub, copyable: true, truncated: false }
      : profile?.pubkey
        ? {
            raw: profile.pubkey,
            display: truncateMiddle(profile.pubkey, 24),
            copyable: true,
            truncated: true,
          }
        : null);
  const heroWebsiteRaw = asMetadataPrimitiveValue(heroMetadata?.website) ?? null;
  const heroWebsiteHref = heroWebsiteRaw?.raw ? sanitizeExternalHref(heroWebsiteRaw.raw) : null;
  const heroWebsite = heroWebsiteHref ? { ...heroWebsiteRaw, raw: heroWebsiteHref } : null;
  const heroWebsiteLabel = heroWebsite?.raw
    ? truncateMiddle(
        heroWebsite.raw
          .replace(/^https?:\/\//i, "")
          .replace(/^www\./i, "")
          .replace(/\/$/, ""),
        32
      )
    : null;
  const heroLud16 = asMetadataPrimitiveValue(heroMetadata?.lud16) ?? null;

  const identityDetailsFromSummary = (() => {
    const details = isRecord(summaryRecord?.identity_details)
      ? summaryRecord.identity_details
      : null;
    const fields = Array.isArray(details?.fields) ? details.fields : [];
    return fields
      .map((entry) => {
        if (!isRecord(entry)) return null;
        const key = typeof entry.key === "string" ? entry.key : "";
        const label = typeof entry.label === "string" ? entry.label : key;
        const value = asMetadataPrimitiveValue(entry.value);
        if (!label || !value) return null;
        return { key, label, value };
      })
      .filter((entry): entry is { key: string; label: string; value: MetadataPrimitiveValue } =>
        Boolean(entry)
      );
  })();
  const heroFieldLimit = 3;
  const heroFields = (profile?.fields ?? []).slice(0, heroFieldLimit);
  const overflowFields = (profile?.fields ?? []).slice(heroFieldLimit);
  const identityDetails = appendOverflowProfileFields(
    presentIdentityDetails(
      identityDetailsFromSummary.length > 0
        ? identityDetailsFromSummary
        : fallbackIdentityDetails(profile, summaryRecord)
    ),
    overflowFields
  );
  const pubkeyHex =
    resolvePubkeyParam(pubkeyOrNpub) ??
    (typeof profile?.pubkey === "string" ? profile.pubkey : null);
  const canonicalNpub =
    (typeof profile?.npub === "string" && profile.npub) ||
    (pubkeyHex ? hexToNpub(pubkeyHex) : null) ||
    pubkeyOrNpub;

  const heroDisplayName =
    (typeof hero?.display_name === "string" ? hero.display_name : undefined) ??
    profile?.display_name ??
    profile?.name ??
    (profile?.pubkey
      ? (() => {
          const npub = hexToNpub(profile.pubkey);
          return npub
            ? truncateIdentifier(npub, "npub", "primary")
            : truncateIdentifier(profile.pubkey, "pubkey", "primary");
        })()
      : "Profile");
  const heroHandleRaw =
    (typeof hero?.handle === "string" ? hero.handle : undefined) ??
    profile?.nip05 ??
    profile?.name ??
    undefined;
  const heroHandle =
    heroHandleRaw && (heroHandleRaw.startsWith("npub1") || /^[0-9a-f]{40,}$/i.test(heroHandleRaw))
      ? truncateIdentifier(
          heroHandleRaw,
          heroHandleRaw.startsWith("npub1") ? "npub" : "pubkey",
          "secondary"
        )
      : formatNip05(heroHandleRaw);
  // Avoid repeating the display name as its own handle (e.g. name "fiatjaf" under "fiatjaf").
  const showHeroHandle = Boolean(
    heroHandle && heroHandle.toLowerCase() !== heroDisplayName.toLowerCase()
  );
  const rawHeroBio =
    (typeof hero?.bio === "string" ? hero.bio : undefined) ??
    (typeof profile?.about === "string" ? profile.about : undefined);
  const heroBio =
    rawHeroBio ?? "Explore public identity, activity, and discovery context for this profile.";
  const heroAvatar = normalizeImageSrc(typeof hero?.avatar === "string" ? hero.avatar : undefined);
  const avatarProfile: Profile = {
    ...(profile ?? { pubkey: lookupKey }),
    ...(heroAvatar ? { picture: heroAvatar } : {}),
  };

  return (
    <div className="space-y-6">
      {errorMessage ? (
        profile ? (
          <SoftRefreshNote message={errorMessage} />
        ) : (
          <ErrorPanel message={errorMessage} />
        )
      ) : null}

      <section className="nm-signal-rule relative pt-6 pb-1 sm:pt-8 sm:pb-2">
        <div className="mb-5 flex justify-end">
          <EntityContextNav view="people" compact />
        </div>
        {bannerSrc ? <ProfileCover src={bannerSrc} /> : null}
        <div className={bannerSrc ? "relative z-10 -mt-8 sm:-mt-10" : undefined}>
          <div className="flex min-w-0 items-start gap-4 sm:gap-5">
            <ProfileAvatar
              profile={avatarProfile}
              size={112}
              alt={profile ? profileLabel(profile) : heroDisplayName}
              enlarge
              className={`bg-surface h-16 w-16 rounded-full object-cover sm:h-24 sm:w-24 ${
                bannerSrc ? "ring-background ring-4" : "border-edge border"
              }`}
            />
            <div className="min-w-0 flex-1 space-y-2 pt-1 sm:pt-3">
              <h1 className="nm-display-lg text-ink-strong truncate" title={heroDisplayName}>
                {heroDisplayName}
              </h1>
              {showHeroHandle && heroHandle ? (
                <p className="text-ink-muted truncate text-sm sm:text-base" title={heroHandleRaw}>
                  {heroHandle}
                </p>
              ) : null}
              {heroWebsite?.raw || heroLud16?.raw || externalHeroActions.length > 0 ? (
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                  {heroWebsite?.raw ? (
                    <Link
                      href={heroWebsite.raw}
                      rel="noopener noreferrer nofollow"
                      target="_blank"
                      className="text-link hover:text-link-hover"
                      title={heroWebsite.raw}
                    >
                      {heroWebsiteLabel}
                      <span aria-hidden className="text-ink-faint ml-1">
                        ↗
                      </span>
                    </Link>
                  ) : null}
                  {heroLud16?.raw ? (
                    <a
                      href={`lightning:${heroLud16.raw}`}
                      className="text-link hover:text-link-hover"
                    >
                      {heroLud16.display ?? heroLud16.raw}
                    </a>
                  ) : null}
                  {externalHeroActions.map((action) => (
                    <Link
                      key={action.id}
                      href={action.href}
                      rel="noopener noreferrer nofollow"
                      target="_blank"
                      className="text-link hover:text-link-hover"
                    >
                      {action.label}
                    </Link>
                  ))}
                </div>
              ) : null}
              {rawHeroBio ? (
                <RichInlineText
                  text={rawHeroBio}
                  className="text-ink-dim line-clamp-2 max-w-3xl text-sm leading-6 [overflow-wrap:anywhere] sm:text-base sm:leading-7"
                  resolution={contentResolution}
                />
              ) : null}
              <ProfileHeroSignals
                trust={trustSummary}
                recentActivityAt={recentActivityAt}
                nowMs={nowMs}
                bot={profile?.bot}
                fields={heroFields}
                className="pt-1"
              />
            </div>
          </div>
        </div>

        <div className="border-edge/60 mt-7 grid gap-5 border-t pt-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          {heroCounters.length > 0 ? (
            <dl className="grid grid-cols-2 gap-x-8 gap-y-4 sm:flex sm:flex-wrap sm:gap-10">
              {heroCounters.map((counter) => (
                <div key={counter.key} className="min-w-20">
                  <dt className="text-ink-faint text-xs">{counter.label}</dt>
                  <dd className="text-ink mt-1 text-lg font-medium tabular-nums">
                    {counter.value.toLocaleString()}
                  </dd>
                </div>
              ))}
            </dl>
          ) : (
            <div />
          )}

          <div data-testid="profile-actions" className="lg:justify-self-end">
            <EntityActions
              kind="profile"
              layout="menu"
              absoluteUrl={absoluteUrl(`/profiles/${encodeURIComponent(canonicalNpub)}`)}
              identifier={canonicalNpub}
              nostrUri={`nostr:${canonicalNpub}`}
              njumpUrl={`https://njump.me/${canonicalNpub}`}
            />
          </div>
        </div>

        <Disclosure
          title="Identity and protocol details"
          description="Keys, verification, and metadata event for this profile."
          className="mt-6"
        >
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {heroNpubOrPubkey?.raw ? (
                <IdBadge
                  id={heroNpubOrPubkey.raw}
                  label={heroNpubOrPubkey.raw.startsWith("npub1") ? "npub" : "pubkey"}
                />
              ) : null}
              {pubkeyHex && heroNpubOrPubkey?.raw !== pubkeyHex ? (
                <IdBadge id={pubkeyHex} label="hex" kind="pubkey" />
              ) : null}
              {heroNpubOrPubkey?.raw ? <CopyValueButton value={heroNpubOrPubkey.raw} /> : null}
            </div>
            {identityDetails.length > 0 ? (
              <ul className="grid gap-3 sm:grid-cols-2">
                {identityDetails.map((field) => {
                  const raw = field.value.raw ?? "";
                  const display = field.value.display ?? raw;
                  const safeUrl = /^https?:\/\//i.test(raw) ? sanitizeExternalHref(raw) : null;
                  const isLud16 = field.key.toLowerCase() === "lud16";
                  return (
                    <li
                      key={`${field.key}-${field.label}`}
                      className="bg-surface-sunken/40 hover:bg-surface-sunken/60 rounded-lg p-3 transition-colors"
                    >
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <p className="text-ink-faint text-[11px]">{field.label}</p>
                        {field.value.copyable && raw ? <CopyValueButton value={raw} /> : null}
                      </div>
                      {safeUrl ? (
                        <Link
                          href={safeUrl}
                          rel="noopener noreferrer nofollow"
                          target="_blank"
                          className="text-link hover:text-link-hover text-sm break-all"
                        >
                          {display}
                        </Link>
                      ) : isLud16 ? (
                        <a
                          href={`lightning:${raw}`}
                          className="text-link hover:text-link-hover text-sm break-all"
                        >
                          {display}
                        </a>
                      ) : (
                        <p className="text-ink-soft text-sm break-all" title={raw || display}>
                          {display}
                        </p>
                      )}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <EmptyState message="No lower-level identity details were returned for this profile." />
            )}
          </div>
        </Disclosure>
      </section>

      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Person",
          name: heroDisplayName,
          description: heroBio,
          url: absoluteUrl(`/profiles/${encodeURIComponent(pubkeyOrNpub)}`),
          identifier: pubkeyOrNpub,
          ...(heroAvatar ? { image: heroAvatar } : {}),
        }}
      />

      <Suspense fallback={<Skeleton className="h-48 w-full rounded-xl" />}>
        <DeferredProfileActivity
          lookupKey={lookupKey}
          profile={profile}
          profileRoute={profileRoute}
          summaryRecord={summaryRecord}
          searchParams={resolvedSearchParams}
        />
      </Suspense>

      <Suspense fallback={<Skeleton className="h-28 w-full rounded-xl" />}>
        <DeferredProfileDiscovery
          lookupKey={lookupKey}
          profileRoute={profileRoute}
          summaryRecord={summaryRecord}
          searchParams={resolvedSearchParams}
        />
      </Suspense>

      <AboutThisData semantics={semantics} />

      <div className="space-y-3">
        <DebugDisclosure title="Debug payload: profile summary" data={summary ?? {}} />
        <DebugDisclosure title="Debug payload: profile enrichment" data={profileEnrichment ?? {}} />
      </div>
    </div>
  );
}
