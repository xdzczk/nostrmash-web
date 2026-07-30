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
import {
  isRecord,
  normalizeImageSrc,
  profileLabel,
  sanitizeExternalHref,
  truncateMiddle,
} from "@/components/explorer/utils";
import {
  DeferredProfileActivity,
  DeferredProfileDiscovery,
} from "@/components/profile/deferred-profile-sections";
import { JsonLd } from "@/components/seo/json-ld";
import { Disclosure } from "@/components/ui/disclosure";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorPanel, SoftRefreshNote } from "@/components/ui/status-panels";
import { hexToNpub } from "@/lib/nostr/nip19";
import { buildProfileActivityTabHref } from "@/lib/profile/activity-tabs";
import {
  getProfileSummaryCached,
  loadProfileFocalData,
} from "@/lib/profile/load-profile-page-data";
import { isValidPubkeyOrNpubParam, resolvePubkeyParam } from "@/lib/routing/params";
import { toUrlSearchParams } from "@/lib/search-params/pagination";
import { absoluteUrl, buildEntityMetadata } from "@/lib/seo/metadata";
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

function normalizeHeroActions(value: unknown): HeroAction[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => {
      if (!isRecord(entry)) return null;
      const id = typeof entry.id === "string" ? entry.id : "";
      const label = typeof entry.label === "string" ? entry.label : "";
      const href = typeof entry.href === "string" ? sanitizeExternalHref(entry.href) : null;
      if (!label || !href) return null;
      return {
        id: id || label.toLowerCase().replace(/\s+/g, "_"),
        label,
        href,
      } satisfies HeroAction;
    })
    .filter((entry): entry is HeroAction => Boolean(entry));
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
    const display = value.length > max ? `${value.slice(0, max - 3)}...` : value;
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
  return rows;
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
        url: `/feeds/profiles/${encodeURIComponent(pubkeyOrNpub)}.xml`,
        title: `${label} notes`,
      },
    });
  } catch {
    return buildEntityMetadata({
      title: `Profile ${truncateMiddle(resolved, 24)}`,
      description: `View profile activity, notes, and network context for ${pubkeyOrNpub}.`,
      path: `/profiles/${encodeURIComponent(pubkeyOrNpub)}`,
      type: "profile",
      rss: {
        url: `/feeds/profiles/${encodeURIComponent(pubkeyOrNpub)}.xml`,
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
    notFound();
  }
  const resolvedSearchParams = await searchParams;
  const currentSearchParams = toUrlSearchParams(resolvedSearchParams);
  const {
    errorMessage,
    lookupKey,
    profile,
    profileEnrichment,
    profileRoute,
    semantics,
    summary,
    summaryRecord,
  } = await loadProfileFocalData(pubkeyOrNpub);

  const hero = isRecord(summaryRecord?.hero) ? summaryRecord.hero : null;
  const heroMetadata = isRecord(hero?.metadata) ? hero.metadata : null;
  const heroCounters = toCounterRows(
    (isRecord(hero?.counters) ? hero.counters : summary?.stats) as ProfileStats
  );
  const parsedHeroActions = normalizeHeroActions(hero?.actions);
  const heroActions =
    parsedHeroActions.length > 0
      ? parsedHeroActions
      : [
          {
            id: "recent_notes",
            label: "Recent notes",
            href: `${buildProfileActivityTabHref(profileRoute, currentSearchParams, "notes")}#profile-activity`,
          },
          {
            id: "related_profiles",
            label: "Related profiles",
            href: `${profileRoute}#related-profiles`,
          },
          { id: "rising_profiles", label: "Rising profiles", href: "/discovery/profiles/rising" },
        ];

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
  const identityDetails =
    identityDetailsFromSummary.length > 0
      ? identityDetailsFromSummary
      : fallbackIdentityDetails(profile, summaryRecord);

  const heroDisplayName =
    (typeof hero?.display_name === "string" ? hero.display_name : undefined) ??
    profile?.display_name ??
    profile?.name ??
    (profile?.pubkey ? truncateMiddle(profile.pubkey, 24) : "Profile");
  const heroHandle =
    (typeof hero?.handle === "string" ? hero.handle : undefined) ??
    profile?.nip05 ??
    profile?.name ??
    undefined;
  const heroBio =
    (typeof hero?.bio === "string" ? hero.bio : undefined) ??
    (typeof profile?.about === "string" ? profile.about : undefined) ??
    "Explore public identity, activity, and discovery context for this profile.";
  const heroAvatar = normalizeImageSrc(typeof hero?.avatar === "string" ? hero.avatar : undefined);
  const avatarProfile: Profile = {
    ...(profile ?? { pubkey: lookupKey }),
    ...(heroAvatar ? { picture: heroAvatar } : {}),
  };

  return (
    <div className="space-y-8">
      {errorMessage ? (
        profile ? (
          <SoftRefreshNote message={errorMessage} />
        ) : (
          <ErrorPanel message={errorMessage} />
        )
      ) : null}

      <section className="nm-signal-rule border-edge/70 border-b pt-8 pb-10 sm:pt-12 sm:pb-14">
        <p className="nm-kicker mb-6">Profile intelligence</p>
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div className="flex min-w-0 items-start gap-5 sm:gap-7">
            <ProfileAvatar
              profile={avatarProfile}
              size={112}
              alt={profile ? profileLabel(profile) : heroDisplayName}
              className="border-edge h-20 w-20 rounded-full border object-cover sm:h-28 sm:w-28"
            />
            <div className="min-w-0 flex-1 space-y-3">
              <h1 className="nm-display-lg text-ink-strong truncate">{heroDisplayName}</h1>
              {heroHandle ? (
                <p className="text-ink-muted truncate text-base">{heroHandle}</p>
              ) : null}
              <p className="text-ink-dim max-w-3xl text-base leading-7">{heroBio}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-sm lg:justify-end">
            {heroWebsite?.raw ? (
              <Link
                href={heroWebsite.raw}
                rel="noopener noreferrer nofollow"
                target="_blank"
                className="text-link hover:text-link-hover"
              >
                {heroWebsite.display ?? truncateMiddle(heroWebsite.raw, 28)}
              </Link>
            ) : null}
            {heroLud16?.raw ? (
              <a href={`lightning:${heroLud16.raw}`} className="text-link hover:text-link-hover">
                {heroLud16.display ?? heroLud16.raw}
              </a>
            ) : null}
          </div>
        </div>

        <div className="border-edge/60 mt-9 grid gap-7 border-t pt-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          {heroCounters.length > 0 ? (
            <dl className="grid grid-cols-2 gap-x-8 gap-y-5 sm:flex sm:flex-wrap sm:gap-10">
              {heroCounters.map((counter) => (
                <div key={counter.key} className="min-w-20">
                  <dt className="text-ink-faint text-xs">{counter.label}</dt>
                  <dd className="text-ink mt-1 text-lg font-medium tabular-nums">
                    {counter.value.toLocaleString()}
                  </dd>
                </div>
              ))}
            </dl>
          ) : null}

          <nav aria-label="Profile shortcuts" className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
            {heroActions.map((action) => (
              <Link key={action.id} href={action.href} className="text-link hover:text-link-hover">
                {action.label}
              </Link>
            ))}
          </nav>
        </div>

        <Disclosure
          title="Open, share, and technical identity"
          description="Protocol identifiers and external client actions."
          className="mt-8"
        >
          <div className="space-y-4">
            {heroNpubOrPubkey?.raw ? (
              <IdBadge
                id={heroNpubOrPubkey.raw}
                label={heroNpubOrPubkey.raw.startsWith("npub1") ? "npub" : "pubkey"}
              />
            ) : null}
            {(() => {
              const pubkeyHex =
                resolvePubkeyParam(pubkeyOrNpub) ??
                (typeof profile?.pubkey === "string" ? profile.pubkey : null);
              const npub =
                (typeof profile?.npub === "string" && profile.npub) ||
                (pubkeyHex ? hexToNpub(pubkeyHex) : null) ||
                pubkeyOrNpub;
              return (
                <EntityActions
                  kind="profile"
                  absoluteUrl={absoluteUrl(`/profiles/${encodeURIComponent(npub)}`)}
                  identifier={npub}
                  nostrUri={`nostr:${npub}`}
                  njumpUrl={`https://njump.me/${npub}`}
                />
              );
            })()}
          </div>
        </Disclosure>
      </section>
      <EntityContextNav view="people" />

      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Person",
          name: heroDisplayName,
          description: heroBio,
          url: absoluteUrl(`/profiles/${encodeURIComponent(pubkeyOrNpub)}`),
          identifier: pubkeyOrNpub,
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

      <Suspense fallback={<Skeleton className="h-40 w-full rounded-xl" />}>
        <DeferredProfileDiscovery
          lookupKey={lookupKey}
          profileRoute={profileRoute}
          summaryRecord={summaryRecord}
          searchParams={resolvedSearchParams}
        />
      </Suspense>

      <Disclosure
        title="Identity details"
        description="Public metadata primitives with compact display and full-value access."
      >
        {identityDetails.length > 0 ? (
          <ul className="grid gap-3 sm:grid-cols-2">
            {identityDetails.map((field) => {
              const raw = field.value.raw ?? "";
              const display = field.value.display ?? raw;
              const safeUrl = sanitizeExternalHref(raw);
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
      </Disclosure>

      <AboutThisData semantics={semantics} />

      <div className="space-y-3">
        <DebugDisclosure title="Debug payload: profile summary" data={summary ?? {}} />
        <DebugDisclosure title="Debug payload: profile enrichment" data={profileEnrichment ?? {}} />
      </div>
    </div>
  );
}
