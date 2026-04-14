import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { cache } from "react";

import { NotesList, ProfilesList } from "@/components/data/renderers";
import { DebugDisclosure } from "@/components/explorer/debug-disclosure";
import { EmptyState } from "@/components/explorer/empty-state";
import { IdBadge } from "@/components/explorer/id-badge";
import { NativeSemanticsBadges } from "@/components/explorer/native-semantics-badges";
import {
  isRecord,
  profileFallbackAvatarDataUrl,
  profileLabel,
  profilePictureUrl,
  truncateMiddle,
} from "@/components/explorer/utils";
import { SectionCard } from "@/components/ui/section-card";
import { ErrorPanel } from "@/components/ui/status-panels";
import {
  getAuthorEvents,
  getProfile,
  getProfileSummary,
  getRelatedProfiles,
  getRisingProfiles,
} from "@/lib/api/endpoints";
import {
  extractNativeApiSemantics,
  normalizeEventRecords,
  normalizeProfiles,
} from "@/lib/api/normalize";
import {
  buildContinuationHref,
  readSearchParam,
  toUrlSearchParams,
} from "@/lib/search-params/pagination";
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

const getProfileSummaryCached = cache(async (pubkeyOrNpub: string) =>
  getProfileSummary(pubkeyOrNpub, "requestTime")
);

function hasIdentityMetadata(profile: Profile | null | undefined): boolean {
  if (!profile) return false;
  return [
    profile.display_name,
    profile.name,
    profile.about,
    profile.picture,
    profile.nip05,
    profile.lud16,
    profile.website,
  ].some((value) => typeof value === "string" && value.trim().length > 0);
}

function isNotFoundReason(reason: unknown): boolean {
  return reason instanceof Error && /API 404:/i.test(reason.message);
}

function mergeProfile(
  summaryProfile: Profile | null,
  enrichedProfile: Profile | null
): Profile | null {
  if (!summaryProfile && !enrichedProfile) return null;
  if (!summaryProfile) return enrichedProfile;
  if (!enrichedProfile) return summaryProfile;
  return {
    ...enrichedProfile,
    ...summaryProfile,
    pubkey: summaryProfile.pubkey || enrichedProfile.pubkey,
  };
}

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
      const href = typeof entry.href === "string" ? entry.href : "";
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
  try {
    const summary = await getProfileSummaryCached(pubkeyOrNpub);
    const profile = summary.profile ?? (summary as unknown as Profile);
    const label =
      profile.display_name ?? profile.name ?? profile.npub ?? profile.pubkey ?? pubkeyOrNpub;
    return {
      title: label,
      description: `View profile activity, notes, and network context for ${label}.`,
    };
  } catch {
    return {
      title: `Profile ${pubkeyOrNpub}`,
      description: `View profile activity, notes, and network context for ${pubkeyOrNpub}.`,
    };
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
  const resolvedSearchParams = await searchParams;
  const notesCursor = readSearchParam(resolvedSearchParams, "notes_cursor");
  const relatedProfilesCursor = readSearchParam(resolvedSearchParams, "related_profiles_cursor");
  const currentSearchParams = toUrlSearchParams(resolvedSearchParams);

  const errors: string[] = [];
  let summary: Awaited<ReturnType<typeof getProfileSummary>> | null = null;
  let profileEnrichment: Awaited<ReturnType<typeof getProfile>> | null = null;
  let recentNotesFallbackPayload: Awaited<ReturnType<typeof getAuthorEvents>> | null = null;
  let relatedProfilesFallbackPayload: Awaited<ReturnType<typeof getRelatedProfiles>> | null = null;
  let risingProfilesPayload: Awaited<ReturnType<typeof getRisingProfiles>> | null = null;

  const summaryResult = await Promise.allSettled([getProfileSummaryCached(pubkeyOrNpub)]);
  if (summaryResult[0].status === "fulfilled") {
    summary = summaryResult[0].value;
  } else {
    errors.push(
      summaryResult[0].reason instanceof Error
        ? summaryResult[0].reason.message
        : "Failed to load profile summary."
    );
  }

  const summaryRecord = isRecord(summary) ? summary : null;
  const summaryProfile = summary ? (summary.profile ?? (summary as unknown as Profile)) : null;
  const lookupKey = summaryProfile?.pubkey ?? summary?.pubkey ?? pubkeyOrNpub;

  const summaryRecentNotes = normalizeEventRecords(summaryRecord?.recent_notes);
  const summaryRelatedDiscovery = isRecord(summaryRecord?.related_discovery)
    ? summaryRecord.related_discovery
    : null;
  const summaryRelatedProfiles = normalizeProfiles(summaryRelatedDiscovery?.related_profiles);
  const summaryRisingProfiles = normalizeProfiles(summaryRelatedDiscovery?.rising_profiles);

  const shouldEnrichProfile = !hasIdentityMetadata(summaryProfile);
  const shouldLoadRecentNotesFallback =
    typeof notesCursor === "string" || summaryRecentNotes.length === 0;
  const shouldLoadRelatedProfilesFallback =
    typeof relatedProfilesCursor === "string" || summaryRelatedProfiles.length === 0;
  const shouldLoadRisingProfilesFallback = summaryRisingProfiles.length === 0;

  const [profileResult, notesFallbackResult, relatedFallbackResult, risingProfilesResult] =
    await Promise.allSettled([
      shouldEnrichProfile ? getProfile(lookupKey, "requestTime") : Promise.resolve(null),
      shouldLoadRecentNotesFallback
        ? getAuthorEvents(lookupKey, "requestTime", { cursor: notesCursor })
        : Promise.resolve(null),
      shouldLoadRelatedProfilesFallback
        ? getRelatedProfiles(lookupKey, "requestTime", { cursor: relatedProfilesCursor })
        : Promise.resolve(null),
      shouldLoadRisingProfilesFallback ? getRisingProfiles("shortTtl") : Promise.resolve(null),
    ]);

  if (profileResult.status === "fulfilled") {
    profileEnrichment = profileResult.value;
  } else if (shouldEnrichProfile) {
    errors.push(
      profileResult.reason instanceof Error
        ? profileResult.reason.message
        : "Failed to enrich profile metadata."
    );
  }
  if (notesFallbackResult.status === "fulfilled") {
    recentNotesFallbackPayload = notesFallbackResult.value;
  } else if (shouldLoadRecentNotesFallback && !isNotFoundReason(notesFallbackResult.reason)) {
    errors.push(
      notesFallbackResult.reason instanceof Error
        ? notesFallbackResult.reason.message
        : "Failed to load recent notes."
    );
  }
  if (relatedFallbackResult.status === "fulfilled") {
    relatedProfilesFallbackPayload = relatedFallbackResult.value;
  } else if (shouldLoadRelatedProfilesFallback && !isNotFoundReason(relatedFallbackResult.reason)) {
    errors.push(
      relatedFallbackResult.reason instanceof Error
        ? relatedFallbackResult.reason.message
        : "Failed to load related profiles."
    );
  }
  if (risingProfilesResult.status === "fulfilled") {
    risingProfilesPayload = risingProfilesResult.value;
  } else if (shouldLoadRisingProfilesFallback && !isNotFoundReason(risingProfilesResult.reason)) {
    errors.push(
      risingProfilesResult.reason instanceof Error
        ? risingProfilesResult.reason.message
        : "Failed to load rising profiles."
    );
  }

  const profile = mergeProfile(summaryProfile, profileEnrichment);
  const semantics = extractNativeApiSemantics(
    summary,
    profileEnrichment,
    recentNotesFallbackPayload
  );
  const notes =
    summaryRecentNotes.length > 0 ? summaryRecentNotes : (recentNotesFallbackPayload?.events ?? []);
  const relatedProfiles =
    summaryRelatedProfiles.length > 0
      ? summaryRelatedProfiles
      : (relatedProfilesFallbackPayload?.related_profiles ?? []);
  const risingProfiles =
    summaryRisingProfiles.length > 0
      ? summaryRisingProfiles
      : (risingProfilesPayload?.profiles ?? []);

  const notesNextCursor = extractNativeApiSemantics(recentNotesFallbackPayload).next_cursor;
  const relatedProfilesNextCursor = extractNativeApiSemantics(
    relatedProfilesFallbackPayload
  ).next_cursor;
  const notesContinuationHref = buildContinuationHref(
    `/profiles/${encodeURIComponent(pubkeyOrNpub)}`,
    currentSearchParams,
    "notes_cursor",
    notesNextCursor
  );
  const relatedProfilesContinuationHref = buildContinuationHref(
    `/profiles/${encodeURIComponent(pubkeyOrNpub)}`,
    currentSearchParams,
    "related_profiles_cursor",
    relatedProfilesNextCursor
  );

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
            href: `/profiles/${encodeURIComponent(pubkeyOrNpub)}#authored-notes`,
          },
          {
            id: "related_profiles",
            label: "Related profiles",
            href: `/profiles/${encodeURIComponent(pubkeyOrNpub)}#related-profiles`,
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
  const heroWebsite = asMetadataPrimitiveValue(heroMetadata?.website) ?? null;
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
  const avatar =
    (typeof hero?.avatar === "string" ? hero.avatar : undefined) ??
    (profile ? profilePictureUrl(profile) : null) ??
    (profile
      ? profileFallbackAvatarDataUrl(profile)
      : profileFallbackAvatarDataUrl({ pubkey: lookupKey }));

  const notesAuthorMap =
    profile?.pubkey && profile.pubkey.length > 0
      ? { [profile.pubkey.toLowerCase()]: profile }
      : undefined;
  const errorMessage = errors.length > 0 ? errors.join(" | ") : "";

  return (
    <div className="space-y-8">
      {errorMessage ? <ErrorPanel message={errorMessage} /> : null}

      <SectionCard title="Profile" description="Identity-first explorer surface for this account.">
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <Image
              src={avatar}
              alt={profile ? profileLabel(profile) : heroDisplayName}
              width={72}
              height={72}
              unoptimized
              className="h-16 w-16 rounded-full border border-zinc-700 object-cover sm:h-[72px] sm:w-[72px]"
            />
            <div className="min-w-0 flex-1 space-y-1">
              <p className="truncate text-xl font-semibold tracking-tight text-zinc-100">
                {heroDisplayName}
              </p>
              {heroHandle ? <p className="truncate text-sm text-zinc-400">{heroHandle}</p> : null}
              <p className="text-sm leading-6 text-zinc-300">{heroBio}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <NativeSemanticsBadges semantics={semantics} />
            {heroNpubOrPubkey?.raw ? (
              <IdBadge
                id={heroNpubOrPubkey.raw}
                label={heroNpubOrPubkey.raw.startsWith("npub1") ? "npub" : "pubkey"}
              />
            ) : null}
            {heroWebsite?.raw ? (
              <Link
                href={heroWebsite.raw}
                className="rounded-full border border-zinc-700 bg-zinc-900/80 px-2 py-1 text-zinc-300 hover:text-zinc-100"
              >
                {heroWebsite.display ?? truncateMiddle(heroWebsite.raw, 28)}
              </Link>
            ) : null}
            {heroLud16?.raw ? (
              <a
                href={`lightning:${heroLud16.raw}`}
                className="rounded-full border border-zinc-700 bg-zinc-900/80 px-2 py-1 text-zinc-300 hover:text-zinc-100"
              >
                {heroLud16.display ?? heroLud16.raw}
              </a>
            ) : null}
          </div>

          {heroCounters.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {heroCounters.map((counter) => (
                <div
                  key={counter.key}
                  className="rounded-full border border-zinc-700 bg-zinc-900/80 px-3 py-1.5 text-xs text-zinc-300"
                >
                  <span className="mr-2 text-zinc-500">{counter.label}</span>
                  <span className="font-medium text-zinc-100">{counter.value}</span>
                </div>
              ))}
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2 text-xs">
            {heroActions.map((action) => (
              <Link
                key={action.id}
                href={action.href}
                className="rounded-full border border-zinc-700 px-2.5 py-1 text-zinc-300 hover:text-zinc-100"
              >
                {action.label}
              </Link>
            ))}
          </div>
        </div>
      </SectionCard>

      <div id="authored-notes">
        <SectionCard title="Recent notes" description="Latest authored notes from this profile.">
          {notes.length > 0 ? (
            <>
              <NotesList notes={notes} authorsByPubkey={notesAuthorMap} />
              {typeof notesNextCursor === "string" && notesNextCursor.length > 0 ? (
                <div className="mt-4 rounded-md border border-indigo-500/30 bg-indigo-500/10 p-3">
                  <p className="text-xs text-indigo-100">More notes are available.</p>
                  <Link
                    href={notesContinuationHref}
                    className="mt-2 inline-block rounded-full border border-indigo-500/40 px-3 py-1 text-xs text-indigo-200 hover:text-indigo-100"
                  >
                    Continue notes
                  </Link>
                </div>
              ) : null}
            </>
          ) : (
            <EmptyState message="No recent notes were returned for this profile." />
          )}
        </SectionCard>
      </div>

      <div id="related-profiles">
        <SectionCard
          title="Related discovery"
          description="Connected profiles and rising discovery surfaces related to this profile."
        >
          <div className="space-y-5">
            <div className="space-y-2">
              <p className="text-xs font-medium tracking-wide text-zinc-400 uppercase">
                Related profiles
              </p>
              {relatedProfiles.length > 0 ? (
                <>
                  <ProfilesList profiles={relatedProfiles.slice(0, 8)} />
                  {typeof relatedProfilesNextCursor === "string" &&
                  relatedProfilesNextCursor.length > 0 ? (
                    <Link
                      href={relatedProfilesContinuationHref}
                      className="inline-block text-sm text-indigo-300"
                    >
                      Continue related profiles
                    </Link>
                  ) : null}
                </>
              ) : (
                <EmptyState message="No related profiles were returned for this profile yet." />
              )}
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium tracking-wide text-zinc-400 uppercase">
                Rising profiles
              </p>
              {risingProfiles.length > 0 ? (
                <ProfilesList profiles={risingProfiles.slice(0, 8)} />
              ) : (
                <EmptyState message="No rising profiles are available right now." />
              )}
            </div>
          </div>
        </SectionCard>
      </div>

      <SectionCard
        title="Identity details"
        description="Public metadata primitives with compact display and full-value access."
      >
        {identityDetails.length > 0 ? (
          <ul className="grid gap-3 sm:grid-cols-2">
            {identityDetails.map((field) => {
              const raw = field.value.raw ?? "";
              const display = field.value.display ?? raw;
              const isUrl = /^https?:\/\//i.test(raw);
              const isLud16 = field.key.toLowerCase() === "lud16";
              return (
                <li
                  key={`${field.key}-${field.label}`}
                  className="rounded-md border border-zinc-800 bg-zinc-950/40 p-3"
                >
                  <p className="mb-1 text-[11px] tracking-wide text-zinc-500 uppercase">
                    {field.label}
                  </p>
                  {isUrl ? (
                    <Link
                      href={raw}
                      className="text-sm break-all text-indigo-300 hover:text-indigo-200"
                    >
                      {display}
                    </Link>
                  ) : isLud16 ? (
                    <a
                      href={`lightning:${raw}`}
                      className="text-sm break-all text-indigo-300 hover:text-indigo-200"
                    >
                      {display}
                    </a>
                  ) : (
                    <p className="text-sm break-all text-zinc-200" title={raw || display}>
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
      </SectionCard>

      <div className="space-y-3">
        <DebugDisclosure title="Debug payload: profile summary" data={summary ?? {}} />
        <DebugDisclosure title="Debug payload: profile enrichment" data={profileEnrichment ?? {}} />
        <DebugDisclosure
          title="Debug payload: recent notes fallback"
          data={recentNotesFallbackPayload ?? {}}
        />
        <DebugDisclosure
          title="Debug payload: related profiles fallback"
          data={relatedProfilesFallbackPayload ?? {}}
        />
        <DebugDisclosure
          title="Debug payload: rising profiles fallback"
          data={risingProfilesPayload ?? {}}
        />
      </div>
    </div>
  );
}
/*
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Profile",
  };
}

export default function ProfilePage() {
  return <div>Profile</div>;
}
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { cache } from "react";

import { NotesList, ProfilesList } from "@/components/data/renderers";
import { DebugDisclosure } from "@/components/explorer/debug-disclosure";
import { EmptyState } from "@/components/explorer/empty-state";
import { IdBadge } from "@/components/explorer/id-badge";
import { NativeSemanticsBadges } from "@/components/explorer/native-semantics-badges";
import {
  isRecord,
  profileFallbackAvatarDataUrl,
  profileLabel,
  profilePictureUrl,
  truncateMiddle,
} from "@/components/explorer/utils";
import { SectionCard } from "@/components/ui/section-card";
import { ErrorPanel } from "@/components/ui/status-panels";
import {
  getAuthorEvents,
  getProfile,
  getProfileSummary,
  getRelatedProfiles,
  getRisingProfiles,
} from "@/lib/api/endpoints";
import {
  extractNativeApiSemantics,
  normalizeEventRecords,
  normalizeProfiles,
} from "@/lib/api/normalize";
import {
  buildContinuationHref,
  readSearchParam,
  toUrlSearchParams,
} from "@/lib/search-params/pagination";
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

const getProfileSummaryCached = cache(async (pubkeyOrNpub: string) =>
  getProfileSummary(pubkeyOrNpub, "requestTime")
);

function hasIdentityMetadata(profile: Profile | null | undefined): boolean {
  if (!profile) return false;
  return [
    profile.display_name,
    profile.name,
    profile.about,
    profile.picture,
    profile.nip05,
    profile.lud16,
    profile.website,
  ].some((value) => typeof value === "string" && value.trim().length > 0);
}

function isNotFoundReason(reason: unknown): boolean {
  return reason instanceof Error && /API 404:/i.test(reason.message);
}

function mergeProfile(summaryProfile: Profile | null, enrichedProfile: Profile | null): Profile | null {
  if (!summaryProfile && !enrichedProfile) return null;
  if (!summaryProfile) return enrichedProfile;
  if (!enrichedProfile) return summaryProfile;
  return {
    ...enrichedProfile,
    ...summaryProfile,
    pubkey: summaryProfile.pubkey || enrichedProfile.pubkey,
  };
}

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
      const href = typeof entry.href === "string" ? entry.href : "";
      if (!label || !href) return null;
      return {
        id: id || label.toLowerCase().replace(/\s+/g, "_"),
        label,
        href,
      } satisfies HeroAction;
    })
    .filter((entry): entry is HeroAction => Boolean(entry));
}

function toCounterRows(stats: ProfileStats | undefined): Array<{ key: string; label: string; value: number }> {
  if (!stats) return [];
  const rows = [
    { key: "follower_count", label: "Followers", value: stats.follower_count },
    { key: "following_count", label: "Following", value: stats.following_count },
    { key: "note_count", label: "Notes", value: stats.note_count },
    { key: "reply_count", label: "Replies", value: stats.reply_count },
  ];
  return rows.filter((row): row is { key: string; label: string; value: number } => typeof row.value === "number");
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
  try {
    const summary = await getProfileSummaryCached(pubkeyOrNpub);
    const profile = summary.profile ?? (summary as unknown as Profile);
    const label =
      profile.display_name ?? profile.name ?? profile.npub ?? profile.pubkey ?? pubkeyOrNpub;
    return {
      title: label,
      description: `View profile activity, notes, and network context for ${label}.`,
    };
  } catch {
    return {
      title: `Profile ${pubkeyOrNpub}`,
      description: `View profile activity, notes, and network context for ${pubkeyOrNpub}.`,
    };
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
  const resolvedSearchParams = await searchParams;
  const notesCursor = readSearchParam(resolvedSearchParams, "notes_cursor");
  const relatedProfilesCursor = readSearchParam(resolvedSearchParams, "related_profiles_cursor");
  const currentSearchParams = toUrlSearchParams(resolvedSearchParams);
  const errors: string[] = [];

  let summary: Awaited<ReturnType<typeof getProfileSummary>> | null = null;
  let profileEnrichment: Awaited<ReturnType<typeof getProfile>> | null = null;
  let recentNotesFallbackPayload: Awaited<ReturnType<typeof getAuthorEvents>> | null = null;
  let relatedProfilesFallbackPayload: Awaited<ReturnType<typeof getRelatedProfiles>> | null = null;
  let risingProfilesPayload: Awaited<ReturnType<typeof getRisingProfiles>> | null = null;

  const summaryResult = await Promise.allSettled([getProfileSummaryCached(pubkeyOrNpub)]);
  if (summaryResult[0].status === "fulfilled") {
    summary = summaryResult[0].value;
  } else {
    errors.push(
      summaryResult[0].reason instanceof Error
        ? summaryResult[0].reason.message
        : "Failed to load profile summary."
    );
  }

  const summaryRecord = isRecord(summary) ? summary : null;
  const summaryProfile = summary ? (summary.profile ?? (summary as unknown as Profile)) : null;
  const lookupKey = summaryProfile?.pubkey ?? summary?.pubkey ?? pubkeyOrNpub;
  const shouldEnrichProfile = !hasIdentityMetadata(summaryProfile);

  const summaryRecentNotes = normalizeEventRecords(summaryRecord?.recent_notes);
  const summaryRelatedDiscovery = isRecord(summaryRecord?.related_discovery)
    ? summaryRecord.related_discovery
    : null;
  const summaryRelatedProfiles = normalizeProfiles(summaryRelatedDiscovery?.related_profiles);
  const summaryRisingProfiles = normalizeProfiles(summaryRelatedDiscovery?.rising_profiles);
  const shouldLoadRecentNotesFallback = typeof notesCursor === "string" || summaryRecentNotes.length === 0;
  const shouldLoadRelatedProfilesFallback =
    typeof relatedProfilesCursor === "string" || summaryRelatedProfiles.length === 0;
  const shouldLoadRisingProfilesFallback = summaryRisingProfiles.length === 0;

  const [profileResult, notesFallbackResult, relatedFallbackResult, risingProfilesResult] =
    await Promise.allSettled([
      shouldEnrichProfile ? getProfile(lookupKey, "requestTime") : Promise.resolve(null),
      shouldLoadRecentNotesFallback
        ? getAuthorEvents(lookupKey, "requestTime", { cursor: notesCursor })
        : Promise.resolve(null),
      shouldLoadRelatedProfilesFallback
        ? getRelatedProfiles(lookupKey, "requestTime", { cursor: relatedProfilesCursor })
        : Promise.resolve(null),
      shouldLoadRisingProfilesFallback ? getRisingProfiles("shortTtl") : Promise.resolve(null),
    ]);

  if (profileResult.status === "fulfilled") {
    profileEnrichment = profileResult.value;
  } else if (shouldEnrichProfile) {
    errors.push(
      profileResult.reason instanceof Error
        ? profileResult.reason.message
        : "Failed to enrich profile metadata."
    );
  }

  if (notesFallbackResult.status === "fulfilled") {
    recentNotesFallbackPayload = notesFallbackResult.value;
  } else if (shouldLoadRecentNotesFallback && !isNotFoundReason(notesFallbackResult.reason)) {
    errors.push(
      notesFallbackResult.reason instanceof Error
        ? notesFallbackResult.reason.message
        : "Failed to load recent notes."
    );
  }

  if (relatedFallbackResult.status === "fulfilled") {
    relatedProfilesFallbackPayload = relatedFallbackResult.value;
  } else if (
    shouldLoadRelatedProfilesFallback &&
    !isNotFoundReason(relatedFallbackResult.reason)
  ) {
    errors.push(
      relatedFallbackResult.reason instanceof Error
        ? relatedFallbackResult.reason.message
        : "Failed to load related profiles."
    );
  }

  if (risingProfilesResult.status === "fulfilled") {
    risingProfilesPayload = risingProfilesResult.value;
  } else if (shouldLoadRisingProfilesFallback && !isNotFoundReason(risingProfilesResult.reason)) {
    errors.push(
      risingProfilesResult.reason instanceof Error
        ? risingProfilesResult.reason.message
        : "Failed to load rising profiles."
    );
  }

  const profile = mergeProfile(summaryProfile, profileEnrichment);
  const semantics = extractNativeApiSemantics(summary, profileEnrichment, recentNotesFallbackPayload);
  const notes = summaryRecentNotes.length > 0 ? summaryRecentNotes : recentNotesFallbackPayload?.events ?? [];
  const relatedProfiles =
    summaryRelatedProfiles.length > 0
      ? summaryRelatedProfiles
      : relatedProfilesFallbackPayload?.related_profiles ?? [];
  const risingProfiles =
    summaryRisingProfiles.length > 0 ? summaryRisingProfiles : risingProfilesPayload?.profiles ?? [];

  const notesNextCursor = extractNativeApiSemantics(recentNotesFallbackPayload).next_cursor;
  const relatedProfilesNextCursor = extractNativeApiSemantics(relatedProfilesFallbackPayload).next_cursor;
  const notesContinuationHref = buildContinuationHref(
    `/profiles/${encodeURIComponent(pubkeyOrNpub)}`,
    currentSearchParams,
    "notes_cursor",
    notesNextCursor
  );
  const relatedProfilesContinuationHref = buildContinuationHref(
    `/profiles/${encodeURIComponent(pubkeyOrNpub)}`,
    currentSearchParams,
    "related_profiles_cursor",
    relatedProfilesNextCursor
  );

  const hero = isRecord(summaryRecord?.hero) ? summaryRecord.hero : null;
  const heroMetadata = isRecord(hero?.metadata) ? hero.metadata : null;
  const heroCounters = toCounterRows((isRecord(hero?.counters) ? hero.counters : summary?.stats) as ProfileStats);
  const parsedHeroActions = normalizeHeroActions(hero?.actions);
  const heroActions =
    parsedHeroActions.length > 0
      ? parsedHeroActions
      : [
          {
            id: "recent_notes",
            label: "Recent notes",
            href: `/profiles/${encodeURIComponent(pubkeyOrNpub)}#authored-notes`,
          },
          {
            id: "related_profiles",
            label: "Related profiles",
            href: `/profiles/${encodeURIComponent(pubkeyOrNpub)}#related-profiles`,
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
  const heroWebsite = asMetadataPrimitiveValue(heroMetadata?.website) ?? null;
  const heroLud16 = asMetadataPrimitiveValue(heroMetadata?.lud16) ?? null;

  const identityDetailsFromSummary = (() => {
    const details = isRecord(summaryRecord?.identity_details) ? summaryRecord.identity_details : null;
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
      .filter(
        (entry): entry is { key: string; label: string; value: MetadataPrimitiveValue } =>
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
  const avatar =
    (typeof hero?.avatar === "string" ? hero.avatar : undefined) ??
    (profile ? profilePictureUrl(profile) : null) ??
    (profile ? profileFallbackAvatarDataUrl(profile) : profileFallbackAvatarDataUrl({ pubkey: lookupKey }));

  const notesAuthorMap =
    profile?.pubkey && profile.pubkey.length > 0
      ? { [profile.pubkey.toLowerCase()]: profile }
      : undefined;
  const errorMessage = errors.length > 0 ? errors.join(" | ") : "";

  return (
    <div className="space-y-8">
      {errorMessage ? <ErrorPanel message={errorMessage} /> : null}

      <SectionCard title="Profile" description="Identity-first explorer surface for this account.">
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <Image
              src={avatar}
              alt={profile ? profileLabel(profile) : heroDisplayName}
              width={72}
              height={72}
              unoptimized
              className="h-16 w-16 rounded-full border border-zinc-700 object-cover sm:h-[72px] sm:w-[72px]"
            />
            <div className="min-w-0 flex-1 space-y-1">
              <p className="truncate text-xl font-semibold tracking-tight text-zinc-100">{heroDisplayName}</p>
              {heroHandle ? <p className="truncate text-sm text-zinc-400">{heroHandle}</p> : null}
              <p className="text-sm leading-6 text-zinc-300">{heroBio}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <NativeSemanticsBadges semantics={semantics} />
            {heroNpubOrPubkey?.raw ? (
              <IdBadge
                id={heroNpubOrPubkey.raw}
                label={heroNpubOrPubkey.raw.startsWith("npub1") ? "npub" : "pubkey"}
              />
            ) : null}
            {heroWebsite?.raw ? (
              <Link
                href={heroWebsite.raw}
                className="rounded-full border border-zinc-700 bg-zinc-900/80 px-2 py-1 text-zinc-300 hover:text-zinc-100"
              >
                {heroWebsite.display ?? truncateMiddle(heroWebsite.raw, 28)}
              </Link>
            ) : null}
            {heroLud16?.raw ? (
              <a
                href={`lightning:${heroLud16.raw}`}
                className="rounded-full border border-zinc-700 bg-zinc-900/80 px-2 py-1 text-zinc-300 hover:text-zinc-100"
              >
                {heroLud16.display ?? heroLud16.raw}
              </a>
            ) : null}
          </div>

          {heroCounters.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {heroCounters.map((counter) => (
                <div
                  key={counter.key}
                  className="rounded-full border border-zinc-700 bg-zinc-900/80 px-3 py-1.5 text-xs text-zinc-300"
                >
                  <span className="mr-2 text-zinc-500">{counter.label}</span>
                  <span className="font-medium text-zinc-100">{counter.value}</span>
                </div>
              ))}
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2 text-xs">
            {heroActions.map((action) => (
              <Link
                key={action.id}
                href={action.href}
                className="rounded-full border border-zinc-700 px-2.5 py-1 text-zinc-300 hover:text-zinc-100"
              >
                {action.label}
              </Link>
            ))}
          </div>
        </div>
      </SectionCard>

      <div id="authored-notes">
        <SectionCard title="Recent notes" description="Latest authored notes from this profile.">
          {notes.length > 0 ? (
            <>
              <NotesList notes={notes} authorsByPubkey={notesAuthorMap} />
              {typeof notesNextCursor === "string" && notesNextCursor.length > 0 ? (
                <div className="mt-4 rounded-md border border-indigo-500/30 bg-indigo-500/10 p-3">
                  <p className="text-xs text-indigo-100">More notes are available.</p>
                  <Link
                    href={notesContinuationHref}
                    className="mt-2 inline-block rounded-full border border-indigo-500/40 px-3 py-1 text-xs text-indigo-200 hover:text-indigo-100"
                  >
                    Continue notes
                  </Link>
                </div>
              ) : null}
            </>
          ) : (
            <EmptyState message="No recent notes were returned for this profile." />
          )}
        </SectionCard>
      </div>

      <div id="related-profiles">
        <SectionCard
          title="Related discovery"
          description="Connected profiles and rising discovery surfaces related to this profile."
        >
          <div className="space-y-5">
            <div className="space-y-2">
              <p className="text-xs font-medium tracking-wide text-zinc-400 uppercase">Related profiles</p>
              {relatedProfiles.length > 0 ? (
                <>
                  <ProfilesList profiles={relatedProfiles.slice(0, 8)} />
                  {typeof relatedProfilesNextCursor === "string" &&
                  relatedProfilesNextCursor.length > 0 ? (
                    <Link
                      href={relatedProfilesContinuationHref}
                      className="inline-block text-sm text-indigo-300"
                    >
                      Continue related profiles
                    </Link>
                  ) : null}
                </>
              ) : (
                <EmptyState message="No related profiles were returned for this profile yet." />
              )}
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium tracking-wide text-zinc-400 uppercase">Rising profiles</p>
              {risingProfiles.length > 0 ? (
                <ProfilesList profiles={risingProfiles.slice(0, 8)} />
              ) : (
                <EmptyState message="No rising profiles are available right now." />
              )}
            </div>
          </div>
        </SectionCard>
      </div>

      <SectionCard
        title="Identity details"
        description="Public metadata primitives with compact display and full-value access."
      >
        {identityDetails.length > 0 ? (
          <ul className="grid gap-3 sm:grid-cols-2">
            {identityDetails.map((field) => {
              const raw = field.value.raw ?? "";
              const display = field.value.display ?? raw;
              const isUrl = /^https?:\/\//i.test(raw);
              const isLud16 = field.key.toLowerCase() === "lud16";
              return (
                <li
                  key={`${field.key}-${field.label}`}
                  className="rounded-md border border-zinc-800 bg-zinc-950/40 p-3"
                >
                  <p className="mb-1 text-[11px] uppercase tracking-wide text-zinc-500">{field.label}</p>
                  {isUrl ? (
                    <Link href={raw} className="break-all text-sm text-indigo-300 hover:text-indigo-200">
                      {display}
                    </Link>
                  ) : isLud16 ? (
                    <a
                      href={`lightning:${raw}`}
                      className="break-all text-sm text-indigo-300 hover:text-indigo-200"
                    >
                      {display}
                    </a>
                  ) : (
                    <p className="break-all text-sm text-zinc-200" title={raw || display}>
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
      </SectionCard>

      <div className="space-y-3">
        <DebugDisclosure title="Debug payload: profile summary" data={summary ?? {}} />
        <DebugDisclosure title="Debug payload: profile enrichment" data={profileEnrichment ?? {}} />
        <DebugDisclosure title="Debug payload: recent notes fallback" data={recentNotesFallbackPayload ?? {}} />
        <DebugDisclosure
          title="Debug payload: related profiles fallback"
          data={relatedProfilesFallbackPayload ?? {}}
        />
        <DebugDisclosure title="Debug payload: rising profiles fallback" data={risingProfilesPayload ?? {}} />
      </div>
    </div>
  );
}
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { cache } from "react";

import { DebugDisclosure } from "@/components/explorer/debug-disclosure";
import { EmptyState } from "@/components/explorer/empty-state";
import { IdBadge } from "@/components/explorer/id-badge";
import { NativeSemanticsBadges } from "@/components/explorer/native-semantics-badges";
import {
  isRecord,
  profileFallbackAvatarDataUrl,
  profileLabel,
  profilePictureUrl,
  truncateMiddle,
} from "@/components/explorer/utils";
import { NotesList, ProfilesList } from "@/components/data/renderers";
import { SectionCard } from "@/components/ui/section-card";
import { ErrorPanel } from "@/components/ui/status-panels";
import {
  getAuthorEvents,
  getProfile,
  getProfileSummary,
  getRelatedProfiles,
  getRisingProfiles,
} from "@/lib/api/endpoints";
import { extractNativeApiSemantics, normalizeEventRecords, normalizeProfiles } from "@/lib/api/normalize";
import {
  buildContinuationHref,
  readSearchParam,
  toUrlSearchParams,
} from "@/lib/search-params/pagination";
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

const getProfileSummaryCached = cache(async (pubkeyOrNpub: string) =>
  getProfileSummary(pubkeyOrNpub, "requestTime")
);

function hasIdentityMetadata(profile: Profile | null | undefined): boolean {
  if (!profile) return false;
  return [
    profile.display_name,
    profile.name,
    profile.about,
    profile.picture,
    profile.nip05,
    profile.lud16,
    profile.website,
  ].some((value) => typeof value === "string" && value.trim().length > 0);
}

function isNotFoundReason(reason: unknown): boolean {
  return reason instanceof Error && /API 404:/i.test(reason.message);
}

function mergeProfile(summaryProfile: Profile | null, enrichedProfile: Profile | null): Profile | null {
  if (!summaryProfile && !enrichedProfile) return null;
  if (!summaryProfile) return enrichedProfile;
  if (!enrichedProfile) return summaryProfile;
  return {
    ...enrichedProfile,
    ...summaryProfile,
    pubkey: summaryProfile.pubkey || enrichedProfile.pubkey,
  };
}

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
      const href = typeof entry.href === "string" ? entry.href : "";
      if (!label || !href) return null;
      return {
        id: id || label.toLowerCase().replace(/\s+/g, "_"),
        label,
        href,
      } satisfies HeroAction;
    })
    .filter((entry): entry is HeroAction => Boolean(entry));
}

function fallbackIdentityDetails(
  profile: Profile | null,
  summary: Record<string, unknown> | null
): Array<{ key: string; label: string; value: MetadataPrimitiveValue }> {
  if (!profile) return [];
  const entries: Array<{ key: string; label: string; value: MetadataPrimitiveValue }> = [];
  const push = (key: string, label: string, rawValue: unknown) => {
    if (typeof rawValue !== "string" || rawValue.trim().length === 0) return;
    const trimmed = rawValue.trim();
    const max = key === "about" ? 120 : 56;
    const display = trimmed.length > max ? `${trimmed.slice(0, max - 3)}...` : trimmed;
    entries.push({
      key,
      label,
      value: {
        raw: trimmed,
        display,
        copyable: true,
        truncated: display !== trimmed,
      },
    });
  };

  push("npub", "Npub", profile.npub);
  push("pubkey", "Pubkey", profile.pubkey);
  push("nip05", "NIP-05", profile.nip05);
  push("website", "Website", profile.website);
  push("lud16", "LUD-16", profile.lud16);
  push("about", "About", profile.about);
  push("metadata_event_id", "Metadata event", summary?.metadata_event_id);
  return entries;
}

function toCounterRows(stats: ProfileStats | undefined): Array<{ key: string; label: string; value: number }> {
  if (!stats) return [];
  const rows = [
    { key: "follower_count", label: "Followers", value: stats.follower_count },
    { key: "following_count", label: "Following", value: stats.following_count },
    { key: "note_count", label: "Notes", value: stats.note_count },
    { key: "reply_count", label: "Replies", value: stats.reply_count },
  ];
  return rows.filter((row): row is { key: string; label: string; value: number } => typeof row.value === "number");
}

function profileLabelOrFallback(profile: Profile | null, fallback: string): string {
  if (!profile) return fallback;
  return profileLabel(profile);
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { pubkeyOrNpub } = await params;
  try {
    const summary = await getProfileSummaryCached(pubkeyOrNpub);
    const profile = summary.profile ?? (summary as unknown as Profile);
    const label =
      profile.display_name ?? profile.name ?? profile.npub ?? profile.pubkey ?? pubkeyOrNpub;
    return {
      title: label,
      description: `View profile activity, notes, and network context for ${label}.`,
    };
  } catch {
    return {
      title: `Profile ${pubkeyOrNpub}`,
      description: `View profile activity, notes, and network context for ${pubkeyOrNpub}.`,
    };
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
  const resolvedSearchParams = await searchParams;
  const notesCursor = readSearchParam(resolvedSearchParams, "notes_cursor");
  const relatedProfilesCursor = readSearchParam(resolvedSearchParams, "related_profiles_cursor");
  const currentSearchParams = toUrlSearchParams(resolvedSearchParams);
  const errors: string[] = [];

  let summary: Awaited<ReturnType<typeof getProfileSummary>> | null = null;
  let profileEnrichment: Awaited<ReturnType<typeof getProfile>> | null = null;
  let recentNotesFallbackPayload: Awaited<ReturnType<typeof getAuthorEvents>> | null = null;
  let relatedProfilesFallbackPayload: Awaited<ReturnType<typeof getRelatedProfiles>> | null = null;
  let risingProfilesPayload: Awaited<ReturnType<typeof getRisingProfiles>> | null = null;

  const summaryResult = await Promise.allSettled([getProfileSummaryCached(pubkeyOrNpub)]);
  if (summaryResult[0].status === "fulfilled") {
    summary = summaryResult[0].value;
  } else {
    errors.push(
      summaryResult[0].reason instanceof Error
        ? summaryResult[0].reason.message
        : "Failed to load profile summary."
    );
  }

  const summaryRecord = isRecord(summary) ? summary : null;
  const summaryProfile = summary ? (summary.profile ?? (summary as unknown as Profile)) : null;
  const lookupKey = summaryProfile?.pubkey ?? summary?.pubkey ?? pubkeyOrNpub;
  const shouldEnrichProfile = !hasIdentityMetadata(summaryProfile);

  const summaryRecentNotes = normalizeEventRecords(summaryRecord?.recent_notes);
  const summaryRelatedDiscovery = isRecord(summaryRecord?.related_discovery)
    ? summaryRecord.related_discovery
    : null;
  const summaryRelatedProfiles = normalizeProfiles(summaryRelatedDiscovery?.related_profiles);
  const summaryRisingProfiles = normalizeProfiles(summaryRelatedDiscovery?.rising_profiles);
  const shouldLoadRecentNotesFallback = typeof notesCursor === "string" || summaryRecentNotes.length === 0;
  const shouldLoadRelatedProfilesFallback =
    typeof relatedProfilesCursor === "string" || summaryRelatedProfiles.length === 0;
  const shouldLoadRisingProfilesFallback = summaryRisingProfiles.length === 0;

  const [profileResult, notesFallbackResult, relatedFallbackResult, risingProfilesResult] =
    await Promise.allSettled([
      shouldEnrichProfile ? getProfile(lookupKey, "requestTime") : Promise.resolve(null),
      shouldLoadRecentNotesFallback
        ? getAuthorEvents(lookupKey, "requestTime", { cursor: notesCursor })
        : Promise.resolve(null),
      shouldLoadRelatedProfilesFallback
        ? getRelatedProfiles(lookupKey, "requestTime", { cursor: relatedProfilesCursor })
        : Promise.resolve(null),
      shouldLoadRisingProfilesFallback ? getRisingProfiles("shortTtl") : Promise.resolve(null),
    ]);

  if (profileResult.status === "fulfilled") {
    profileEnrichment = profileResult.value;
  } else if (shouldEnrichProfile) {
    errors.push(
      profileResult.reason instanceof Error
        ? profileResult.reason.message
        : "Failed to enrich profile metadata."
    );
  }

  if (notesFallbackResult.status === "fulfilled") {
    recentNotesFallbackPayload = notesFallbackResult.value;
  } else if (shouldLoadRecentNotesFallback && !isNotFoundReason(notesFallbackResult.reason)) {
    errors.push(
      notesFallbackResult.reason instanceof Error
        ? notesFallbackResult.reason.message
        : "Failed to load recent notes."
    );
  }

  if (relatedFallbackResult.status === "fulfilled") {
    relatedProfilesFallbackPayload = relatedFallbackResult.value;
  } else if (
    shouldLoadRelatedProfilesFallback &&
    !isNotFoundReason(relatedFallbackResult.reason)
  ) {
    errors.push(
      relatedFallbackResult.reason instanceof Error
        ? relatedFallbackResult.reason.message
        : "Failed to load related profiles."
    );
  }

  if (risingProfilesResult.status === "fulfilled") {
    risingProfilesPayload = risingProfilesResult.value;
  } else if (
    shouldLoadRisingProfilesFallback &&
    !isNotFoundReason(risingProfilesResult.reason)
  ) {
    errors.push(
      risingProfilesResult.reason instanceof Error
        ? risingProfilesResult.reason.message
        : "Failed to load rising profiles."
    );
  }

  const profile = mergeProfile(summaryProfile, profileEnrichment);
  const semantics = extractNativeApiSemantics(summary, profileEnrichment, recentNotesFallbackPayload);
  const notes = summaryRecentNotes.length > 0 ? summaryRecentNotes : recentNotesFallbackPayload?.events ?? [];
  const relatedProfiles =
    summaryRelatedProfiles.length > 0
      ? summaryRelatedProfiles
      : relatedProfilesFallbackPayload?.related_profiles ?? [];
  const risingProfiles =
    summaryRisingProfiles.length > 0 ? summaryRisingProfiles : risingProfilesPayload?.profiles ?? [];

  const notesNextCursor = extractNativeApiSemantics(recentNotesFallbackPayload).next_cursor;
  const relatedProfilesNextCursor = extractNativeApiSemantics(relatedProfilesFallbackPayload).next_cursor;
  const notesContinuationHref = buildContinuationHref(
    `/profiles/${encodeURIComponent(pubkeyOrNpub)}`,
    currentSearchParams,
    "notes_cursor",
    notesNextCursor
  );
  const relatedProfilesContinuationHref = buildContinuationHref(
    `/profiles/${encodeURIComponent(pubkeyOrNpub)}`,
    currentSearchParams,
    "related_profiles_cursor",
    relatedProfilesNextCursor
  );

  const hero = isRecord(summaryRecord?.hero) ? summaryRecord.hero : null;
  const heroMetadata = isRecord(hero?.metadata) ? hero.metadata : null;
  const heroCounters = toCounterRows((isRecord(hero?.counters) ? hero.counters : summary?.stats) as ProfileStats);
  const heroActions =
    normalizeHeroActions(hero?.actions).length > 0
      ? normalizeHeroActions(hero?.actions)
      : [
          {
            id: "recent_notes",
            label: "Recent notes",
            href: `/profiles/${encodeURIComponent(pubkeyOrNpub)}#authored-notes`,
          },
          {
            id: "related_profiles",
            label: "Related profiles",
            href: `/profiles/${encodeURIComponent(pubkeyOrNpub)}#related-profiles`,
          },
          {
            id: "rising_profiles",
            label: "Rising profiles",
            href: "/discovery/profiles/rising",
          },
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
  const heroWebsite = asMetadataPrimitiveValue(heroMetadata?.website) ?? null;
  const heroLud16 = asMetadataPrimitiveValue(heroMetadata?.lud16) ?? null;

  const identityDetailsFromSummary = (() => {
    const container = isRecord(summaryRecord?.identity_details) ? summaryRecord.identity_details : null;
    const fields = Array.isArray(container?.fields) ? container.fields : [];
    return fields
      .map((entry) => {
        if (!isRecord(entry)) return null;
        const key = typeof entry.key === "string" ? entry.key : "";
        const label = typeof entry.label === "string" ? entry.label : key;
        const value = asMetadataPrimitiveValue(entry.value);
        if (!label || !value) return null;
        return { key, label, value };
      })
      .filter(
        (entry): entry is { key: string; label: string; value: MetadataPrimitiveValue } =>
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
  const avatar =
    (typeof hero?.avatar === "string" ? hero.avatar : undefined) ??
    (profile ? profilePictureUrl(profile) : null) ??
    (profile ? profileFallbackAvatarDataUrl(profile) : profileFallbackAvatarDataUrl({ pubkey: lookupKey }));

  const notesAuthorMap =
    profile?.pubkey && profile.pubkey.length > 0
      ? { [profile.pubkey.toLowerCase()]: profile }
      : undefined;
  const errorMessage = errors.length > 0 ? errors.join(" | ") : "";

  return (
    <div className="space-y-8">
      {errorMessage ? <ErrorPanel message={errorMessage} /> : null}

      <SectionCard title="Profile" description="Identity-first explorer surface for this account.">
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <Image
              src={avatar}
              alt={profileLabelOrFallback(profile, heroDisplayName)}
              width={72}
              height={72}
              unoptimized
              className="h-16 w-16 rounded-full border border-zinc-700 object-cover sm:h-[72px] sm:w-[72px]"
            />
            <div className="min-w-0 flex-1 space-y-1">
              <p className="truncate text-xl font-semibold tracking-tight text-zinc-100">{heroDisplayName}</p>
              {heroHandle ? <p className="truncate text-sm text-zinc-400">{heroHandle}</p> : null}
              <p className="text-sm leading-6 text-zinc-300">{heroBio}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <NativeSemanticsBadges semantics={semantics} />
            {heroNpubOrPubkey?.raw ? (
              <IdBadge id={heroNpubOrPubkey.raw} label={heroNpubOrPubkey.raw.startsWith("npub1") ? "npub" : "pubkey"} />
            ) : null}
            {heroWebsite?.raw ? (
              <Link
                href={heroWebsite.raw}
                className="rounded-full border border-zinc-700 bg-zinc-900/80 px-2 py-1 text-zinc-300 hover:text-zinc-100"
              >
                {heroWebsite.display ?? truncateMiddle(heroWebsite.raw, 28)}
              </Link>
            ) : null}
            {heroLud16?.raw ? (
              <a
                href={`lightning:${heroLud16.raw}`}
                className="rounded-full border border-zinc-700 bg-zinc-900/80 px-2 py-1 text-zinc-300 hover:text-zinc-100"
              >
                {heroLud16.display ?? heroLud16.raw}
              </a>
            ) : null}
          </div>

          {heroCounters.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {heroCounters.map((counter) => (
                <div
                  key={counter.key}
                  className="rounded-full border border-zinc-700 bg-zinc-900/80 px-3 py-1.5 text-xs text-zinc-300"
                >
                  <span className="mr-2 text-zinc-500">{counter.label}</span>
                  <span className="font-medium text-zinc-100">{counter.value}</span>
                </div>
              ))}
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2 text-xs">
            {heroActions.map((action) => (
              <Link
                key={action.id}
                href={action.href}
                className="rounded-full border border-zinc-700 px-2.5 py-1 text-zinc-300 hover:text-zinc-100"
              >
                {action.label}
              </Link>
            ))}
          </div>
        </div>
      </SectionCard>

      <div id="authored-notes">
        <SectionCard title="Recent notes" description="Latest authored notes from this profile.">
          {notes.length > 0 ? (
            <>
              <NotesList notes={notes} authorsByPubkey={notesAuthorMap} />
              {typeof notesNextCursor === "string" && notesNextCursor.length > 0 ? (
                <div className="mt-4 rounded-md border border-indigo-500/30 bg-indigo-500/10 p-3">
                  <p className="text-xs text-indigo-100">More notes are available.</p>
                  <Link
                    href={notesContinuationHref}
                    className="mt-2 inline-block rounded-full border border-indigo-500/40 px-3 py-1 text-xs text-indigo-200 hover:text-indigo-100"
                  >
                    Continue notes
                  </Link>
                </div>
              ) : null}
            </>
          ) : (
            <EmptyState message="No recent notes were returned for this profile." />
          )}
        </SectionCard>
      </div>

      <div id="related-profiles">
        <SectionCard
          title="Related discovery"
          description="Connected profiles and rising discovery surfaces related to this profile."
        >
          <div className="space-y-5">
            <div className="space-y-2">
              <p className="text-xs font-medium tracking-wide text-zinc-400 uppercase">Related profiles</p>
              {relatedProfiles.length > 0 ? (
                <>
                  <ProfilesList profiles={relatedProfiles.slice(0, 8)} />
                  {typeof relatedProfilesNextCursor === "string" &&
                  relatedProfilesNextCursor.length > 0 ? (
                    <Link
                      href={relatedProfilesContinuationHref}
                      className="inline-block text-sm text-indigo-300"
                    >
                      Continue related profiles
                    </Link>
                  ) : null}
                </>
              ) : (
                <EmptyState message="No related profiles were returned for this profile yet." />
              )}
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium tracking-wide text-zinc-400 uppercase">Rising profiles</p>
              {risingProfiles.length > 0 ? (
                <ProfilesList profiles={risingProfiles.slice(0, 8)} />
              ) : (
                <EmptyState message="No rising profiles are available right now." />
              )}
            </div>
          </div>
        </SectionCard>
      </div>

      <SectionCard
        title="Identity details"
        description="Public metadata primitives with compact display and full-value access."
      >
        {identityDetails.length > 0 ? (
          <ul className="grid gap-3 sm:grid-cols-2">
            {identityDetails.map((field) => {
              const raw = field.value.raw ?? "";
              const display = field.value.display ?? raw;
              const isUrl = /^https?:\/\//i.test(raw);
              const isLud16 = field.key.toLowerCase() === "lud16";
              return (
                <li
                  key={`${field.key}-${field.label}`}
                  className="rounded-md border border-zinc-800 bg-zinc-950/40 p-3"
                >
                  <p className="mb-1 text-[11px] uppercase tracking-wide text-zinc-500">{field.label}</p>
                  {isUrl ? (
                    <Link href={raw} className="break-all text-sm text-indigo-300 hover:text-indigo-200">
                      {display}
                    </Link>
                  ) : isLud16 ? (
                    <a
                      href={`lightning:${raw}`}
                      className="break-all text-sm text-indigo-300 hover:text-indigo-200"
                    >
                      {display}
                    </a>
                  ) : (
                    <p className="break-all text-sm text-zinc-200" title={raw || display}>
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
      </SectionCard>

      <div className="space-y-3">
        <DebugDisclosure title="Debug payload: profile summary" data={summary ?? {}} />
        <DebugDisclosure title="Debug payload: profile enrichment" data={profileEnrichment ?? {}} />
        <DebugDisclosure title="Debug payload: recent notes fallback" data={recentNotesFallbackPayload ?? {}} />
        <DebugDisclosure
          title="Debug payload: related profiles fallback"
          data={relatedProfilesFallbackPayload ?? {}}
        />
        <DebugDisclosure title="Debug payload: rising profiles fallback" data={risingProfilesPayload ?? {}} />
      </div>
    </div>
  );
}
import type { Metadata } from "next";
import Link from "next/link";
import { cache } from "react";

import { DebugDisclosure } from "@/components/explorer/debug-disclosure";
import { EmptyState } from "@/components/explorer/empty-state";
import { IdBadge } from "@/components/explorer/id-badge";
import { MetadataList } from "@/components/explorer/metadata-list";
import { NativeSemanticsBadges } from "@/components/explorer/native-semantics-badges";
import { PageHero } from "@/components/explorer/page-hero";
import { ProfileCard } from "@/components/explorer/profile-card";
import { StatCard } from "@/components/explorer/stat-card";
import { Timestamp } from "@/components/explorer/timestamp";
import { HashtagsList, NotesList, ProfilesList } from "@/components/data/renderers";
import {
  buildMetadataEntries,
  extractPrimitiveStats,
  isRecord,
  truncateMiddle,
} from "@/components/explorer/utils";
import { SectionCard } from "@/components/ui/section-card";
import { ErrorPanel } from "@/components/ui/status-panels";
import {
  getAuthorActivityAnalytics,
  getAuthorEvents,
  getAuthorPostingBehaviorAnalytics,
  getAuthorReplies,
  getContactListContext,
  getProfile,
  getProfileFollowers,
  getProfileMentions,
  getProfileSummary,
  getProfileTopics,
  getRelatedProfiles,
  getRelayListContext,
  getTrustScore,
} from "@/lib/api/endpoints";
import { extractNativeApiSemantics } from "@/lib/api/normalize";
import {
  buildContinuationHref,
  readSearchParam,
  toUrlSearchParams,
} from "@/lib/search-params/pagination";
import type { Profile } from "@/lib/types/api";

type Params = Promise<{ pubkeyOrNpub: string }>;
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const getProfileSummaryCached = cache(async (pubkeyOrNpub: string) =>
  getProfileSummary(pubkeyOrNpub, "requestTime")
);

function hasIdentityMetadata(profile: Profile | null | undefined): boolean {
  if (!profile) return false;
  return [
    profile.display_name,
    profile.name,
    profile.about,
    profile.picture,
    profile.nip05,
    profile.lud16,
    profile.website,
  ].some((value) => typeof value === "string" && value.trim().length > 0);
}

function formatReason(reason: unknown, fallback: string): string {
  return reason instanceof Error ? reason.message : fallback;
}

function isNotFoundReason(reason: unknown): boolean {
  return reason instanceof Error && /API 404:/i.test(reason.message);
}

function dedupeByLabel<T>(
  items: Array<{ label: string; value: T }>
): Array<{ label: string; value: T }> {
  const seen = new Set<string>();
  const deduped: Array<{ label: string; value: T }> = [];
  for (const item of items) {
    const normalized = item.label.trim().toLowerCase();
    if (normalized.length === 0 || seen.has(normalized)) continue;
    seen.add(normalized);
    deduped.push(item);
  }
  return deduped;
}

function mergeProfile(
  summaryProfile: Profile | null,
  enrichedProfile: Profile | null
): Profile | null {
  if (!summaryProfile && !enrichedProfile) return null;
  if (!summaryProfile) return enrichedProfile;
  if (!enrichedProfile) return summaryProfile;
  return {
    ...enrichedProfile,
    ...summaryProfile,
    pubkey: summaryProfile.pubkey || enrichedProfile.pubkey,
  };
}

function relayLabel(entry: unknown): string | null {
  if (typeof entry === "string" && entry.trim().length > 0) return entry.trim();
  if (!isRecord(entry)) return null;
  for (const key of ["relay_url", "url", "relay", "host", "name"]) {
    const value = entry[key];
    if (typeof value === "string" && value.trim().length > 0) return value.trim();
  }
  return null;
}

function toAnalyticsStatCards(
  payload: unknown
): Array<{ label: string; value: string | number | boolean }> {
  if (!isRecord(payload)) return [];
  const records = [
    payload,
    isRecord(payload.analytics) ? payload.analytics : undefined,
    isRecord(payload.stats) ? payload.stats : undefined,
    isRecord(payload.summary) ? payload.summary : undefined,
  ].filter((entry): entry is Record<string, unknown> => Boolean(entry));
  const cards = dedupeByLabel(
    records
      .flatMap((entry) =>
        extractPrimitiveStats(entry, ["pubkey", "author_pubkey", "score", "trust_score"])
      )
      .filter((entry) => {
        const normalized = entry.label.toLowerCase();
        return /(count|ratio|rate|avg|average|median|percent|pct|score|volume|post|note|reply)/i.test(
          normalized
        );
      })
      .map((entry) => ({ label: entry.label, value: entry.value }))
  );
  return cards.slice(0, 8);
}

function toMetadataEntries(
  payload: unknown,
  excludeKeys: string[] = []
): Array<{ label: string; value: unknown }> {
  if (!isRecord(payload)) return [];
  return dedupeByLabel(extractPrimitiveStats(payload, excludeKeys).map((entry) => entry)).slice(
    0,
    12
  );
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { pubkeyOrNpub } = await params;
  try {
    const summary = await getProfileSummaryCached(pubkeyOrNpub);
    const profile = summary.profile ?? (summary as unknown as Profile);
    const label =
      profile.display_name ?? profile.name ?? profile.npub ?? profile.pubkey ?? pubkeyOrNpub;
    return {
      title: label,
      description: `View profile activity, notes, and network context for ${label}.`,
    };
  } catch {
    return {
      title: `Profile ${pubkeyOrNpub}`,
      description: `View profile activity, notes, and network context for ${pubkeyOrNpub}.`,
    };
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
  const resolvedSearchParams = await searchParams;
  const notesCursor = readSearchParam(resolvedSearchParams, "notes_cursor");
  const repliesCursor = readSearchParam(resolvedSearchParams, "replies_cursor");
  const followersCursor = readSearchParam(resolvedSearchParams, "followers_cursor");
  const mentionsCursor = readSearchParam(resolvedSearchParams, "mentions_cursor");
  const relatedProfilesCursor = readSearchParam(resolvedSearchParams, "related_profiles_cursor");
  const currentSearchParams = toUrlSearchParams(resolvedSearchParams);
  const errors: string[] = [];

  let summary: Awaited<ReturnType<typeof getProfileSummary>> | null = null;
  let profileEnrichment: Awaited<ReturnType<typeof getProfile>> | null = null;
  let authoredEventsPayload: Awaited<ReturnType<typeof getAuthorEvents>> | null = null;
  let authoredRepliesPayload: Awaited<ReturnType<typeof getAuthorReplies>> | null = null;
  let followersPayload: Awaited<ReturnType<typeof getProfileFollowers>> | null = null;
  let mentionsPayload: Awaited<ReturnType<typeof getProfileMentions>> | null = null;
  let relatedProfilesPayload: Awaited<ReturnType<typeof getRelatedProfiles>> | null = null;
  let contactListPayload: Awaited<ReturnType<typeof getContactListContext>> | null = null;
  let relayListPayload: Awaited<ReturnType<typeof getRelayListContext>> | null = null;
  let profileTopicsPayload: Awaited<ReturnType<typeof getProfileTopics>> | null = null;
  let authorActivityAnalyticsPayload: Awaited<
    ReturnType<typeof getAuthorActivityAnalytics>
  > | null = null;
  let postingBehaviorAnalyticsPayload: Awaited<
    ReturnType<typeof getAuthorPostingBehaviorAnalytics>
  > | null = null;
  let trustScorePayload: Awaited<ReturnType<typeof getTrustScore>> | null = null;

  const summaryResult = await Promise.allSettled([getProfileSummaryCached(pubkeyOrNpub)]);
  if (summaryResult[0].status === "fulfilled") {
    summary = summaryResult[0].value;
  } else {
    errors.push(
      summaryResult[0].reason instanceof Error
        ? summaryResult[0].reason.message
        : "Failed to load profile summary."
    );
  }

  const summaryProfile = summary ? (summary.profile ?? (summary as unknown as Profile)) : null;
  const lookupKey = summaryProfile?.pubkey ?? summary?.pubkey ?? pubkeyOrNpub;
  const shouldEnrichProfile = !hasIdentityMetadata(summaryProfile);

  const [
    profileResult,
    authoredEventsResult,
    authoredRepliesResult,
    followersResult,
    mentionsResult,
    relatedProfilesResult,
    contactListResult,
    relayListResult,
    profileTopicsResult,
    authorActivityAnalyticsResult,
    postingBehaviorAnalyticsResult,
    trustScoreResult,
  ] = await Promise.allSettled([
    shouldEnrichProfile ? getProfile(lookupKey, "requestTime") : Promise.resolve(null),
    getAuthorEvents(lookupKey, "requestTime", { cursor: notesCursor }),
    getAuthorReplies(lookupKey, "requestTime", { cursor: repliesCursor }),
    getProfileFollowers(lookupKey, "requestTime", { cursor: followersCursor }),
    getProfileMentions(lookupKey, "requestTime", { cursor: mentionsCursor }),
    getRelatedProfiles(lookupKey, "requestTime", { cursor: relatedProfilesCursor }),
    getContactListContext(lookupKey, "requestTime"),
    getRelayListContext(lookupKey, "requestTime"),
    getProfileTopics(lookupKey, "requestTime"),
    getAuthorActivityAnalytics(lookupKey, "requestTime"),
    getAuthorPostingBehaviorAnalytics(lookupKey, "requestTime"),
    getTrustScore(lookupKey, "requestTime"),
  ]);

  if (profileResult.status === "fulfilled") {
    profileEnrichment = profileResult.value;
  } else if (shouldEnrichProfile) {
    errors.push(
      profileResult.reason instanceof Error
        ? profileResult.reason.message
        : "Failed to enrich profile metadata."
    );
  }

  if (authoredEventsResult.status === "fulfilled") {
    authoredEventsPayload = authoredEventsResult.value;
  } else {
    errors.push(
      authoredEventsResult.reason instanceof Error
        ? authoredEventsResult.reason.message
        : "Failed to load authored notes."
    );
  }

  if (authoredRepliesResult.status === "fulfilled") {
    authoredRepliesPayload = authoredRepliesResult.value;
  } else {
    errors.push(formatReason(authoredRepliesResult.reason, "Failed to load authored replies."));
  }

  if (followersResult.status === "fulfilled") {
    followersPayload = followersResult.value;
  } else if (!isNotFoundReason(followersResult.reason)) {
    errors.push(formatReason(followersResult.reason, "Failed to load followers context."));
  }

  if (mentionsResult.status === "fulfilled") {
    mentionsPayload = mentionsResult.value;
  } else if (!isNotFoundReason(mentionsResult.reason)) {
    errors.push(formatReason(mentionsResult.reason, "Failed to load mentions context."));
  }

  if (relatedProfilesResult.status === "fulfilled") {
    relatedProfilesPayload = relatedProfilesResult.value;
  } else if (!isNotFoundReason(relatedProfilesResult.reason)) {
    errors.push(
      formatReason(relatedProfilesResult.reason, "Failed to load related profiles context.")
    );
  }

  if (contactListResult.status === "fulfilled") {
    contactListPayload = contactListResult.value;
  } else if (!isNotFoundReason(contactListResult.reason)) {
    errors.push(formatReason(contactListResult.reason, "Failed to load contact list context."));
  }

  if (relayListResult.status === "fulfilled") {
    relayListPayload = relayListResult.value;
  } else if (!isNotFoundReason(relayListResult.reason)) {
    errors.push(formatReason(relayListResult.reason, "Failed to load relay list context."));
  }

  if (profileTopicsResult.status === "fulfilled") {
    profileTopicsPayload = profileTopicsResult.value;
  } else if (!isNotFoundReason(profileTopicsResult.reason)) {
    errors.push(formatReason(profileTopicsResult.reason, "Failed to load topic interest context."));
  }

  if (authorActivityAnalyticsResult.status === "fulfilled") {
    authorActivityAnalyticsPayload = authorActivityAnalyticsResult.value;
  } else if (!isNotFoundReason(authorActivityAnalyticsResult.reason)) {
    errors.push(
      formatReason(
        authorActivityAnalyticsResult.reason,
        "Failed to load author activity analytics."
      )
    );
  }

  if (postingBehaviorAnalyticsResult.status === "fulfilled") {
    postingBehaviorAnalyticsPayload = postingBehaviorAnalyticsResult.value;
  } else if (!isNotFoundReason(postingBehaviorAnalyticsResult.reason)) {
    errors.push(
      formatReason(
        postingBehaviorAnalyticsResult.reason,
        "Failed to load posting and reply behavior analytics."
      )
    );
  }

  if (trustScoreResult.status === "fulfilled") {
    trustScorePayload = trustScoreResult.value;
  } else if (!isNotFoundReason(trustScoreResult.reason)) {
    errors.push(formatReason(trustScoreResult.reason, "Failed to load trust score metadata."));
  }

  const profile = mergeProfile(summaryProfile, profileEnrichment);
  const semantics = extractNativeApiSemantics(
    summary,
    authoredEventsPayload,
    authoredRepliesPayload,
    profileEnrichment
  );
  const summaryRecentNotePreviews = summary?.recent_note_previews ?? [];
  const notes =
    authoredEventsPayload?.events && authoredEventsPayload.events.length > 0
      ? authoredEventsPayload.events
      : summaryRecentNotePreviews;
  const replies = authoredRepliesPayload?.replies ?? [];
  const followers = followersPayload?.followers ?? [];
  const mentions = mentionsPayload?.mentions ?? [];
  const relatedProfiles = relatedProfilesPayload?.related_profiles ?? [];
  const contactProfiles = contactListPayload?.contacts ?? [];
  const contactRelayHints = (contactListPayload?.relays ?? [])
    .map((entry) => relayLabel(entry))
    .filter((entry): entry is string => typeof entry === "string" && entry.length > 0);
  const relayEntries = relayListPayload?.relays ?? [];
  const interestTopics = profileTopicsPayload?.topics ?? [];
  const interestProfiles = profileTopicsPayload?.profiles ?? [];
  const notesNextCursor = extractNativeApiSemantics(authoredEventsPayload).next_cursor;
  const repliesNextCursor = extractNativeApiSemantics(authoredRepliesPayload).next_cursor;
  const followersNextCursor = extractNativeApiSemantics(followersPayload).next_cursor;
  const mentionsNextCursor = extractNativeApiSemantics(mentionsPayload).next_cursor;
  const relatedProfilesNextCursor = extractNativeApiSemantics(relatedProfilesPayload).next_cursor;
  const notesContinuationHref = buildContinuationHref(
    `/profiles/${encodeURIComponent(pubkeyOrNpub)}`,
    currentSearchParams,
    "notes_cursor",
    notesNextCursor
  );
  const repliesContinuationHref = buildContinuationHref(
    `/profiles/${encodeURIComponent(pubkeyOrNpub)}`,
    currentSearchParams,
    "replies_cursor",
    repliesNextCursor
  );
  const followersContinuationHref = buildContinuationHref(
    `/profiles/${encodeURIComponent(pubkeyOrNpub)}`,
    currentSearchParams,
    "followers_cursor",
    followersNextCursor
  );
  const mentionsContinuationHref = buildContinuationHref(
    `/profiles/${encodeURIComponent(pubkeyOrNpub)}`,
    currentSearchParams,
    "mentions_cursor",
    mentionsNextCursor
  );
  const relatedProfilesContinuationHref = buildContinuationHref(
    `/profiles/${encodeURIComponent(pubkeyOrNpub)}`,
    currentSearchParams,
    "related_profiles_cursor",
    relatedProfilesNextCursor
  );

  const counters = dedupeByLabel(
    extractPrimitiveStats(
      {
        ...(isRecord(summary?.stats) ? summary.stats : {}),
        note_count:
          summary?.note_count ?? (isRecord(summary?.stats) ? summary.stats.note_count : undefined),
        reply_count:
          summary?.reply_count ??
          (isRecord(summary?.stats) ? summary.stats.reply_count : undefined),
        follower_count:
          summary?.follower_count ??
          (isRecord(summary?.stats) ? summary.stats.follower_count : undefined),
        following_count:
          summary?.following_count ??
          (isRecord(summary?.stats) ? summary.stats.following_count : undefined),
        relay_count:
          summary?.relay_count ??
          (isRecord(summary?.stats) ? summary.stats.relay_count : undefined),
      },
      []
    ).filter((entry) =>
      /(follower|following|note_count|reply_count|relay_count|count)/i.test(entry.label)
    )
  ).slice(0, 8);

  const trustScoreFromSummary = extractPrimitiveStats(
    {
      ...(isRecord(summary) ? summary : {}),
      ...(isRecord(summary?.stats) ? summary.stats : {}),
    },
    []
  ).find((entry) => /trust.*score|trust_score|trustscore/i.test(entry.label));
  const trustScoreValue =
    (typeof trustScorePayload?.trust_score === "number" ||
    typeof trustScorePayload?.trust_score === "string"
      ? trustScorePayload.trust_score
      : undefined) ??
    (typeof trustScorePayload?.score === "number" || typeof trustScorePayload?.score === "string"
      ? trustScorePayload.score
      : undefined) ??
    trustScoreFromSummary?.value;
  const trustMetadata = dedupeByLabel(
    [
      ...toMetadataEntries(trustScorePayload, [
        "pubkey",
        "author_pubkey",
        "trust_score",
        "score",
        "metadata",
      ]),
      ...toMetadataEntries(
        isRecord(trustScorePayload?.metadata) ? trustScorePayload.metadata : undefined,
        ["trust_score", "score"]
      ),
    ].filter((entry) => entry.value !== undefined && entry.value !== null)
  ).slice(0, 12);
  const authorActivityStatCards = toAnalyticsStatCards(authorActivityAnalyticsPayload);
  const postingBehaviorStatCards = toAnalyticsStatCards(postingBehaviorAnalyticsPayload);
  const authorActivityMetadata = toMetadataEntries(authorActivityAnalyticsPayload, [
    "pubkey",
    "author_pubkey",
    "analytics",
    "stats",
    "summary",
    "meta",
  ]);
  const postingBehaviorMetadata = toMetadataEntries(postingBehaviorAnalyticsPayload, [
    "pubkey",
    "author_pubkey",
    "analytics",
    "stats",
    "summary",
    "meta",
  ]);

  const details = profile
    ? buildMetadataEntries(profile as Record<string, unknown>, [
        "pubkey",
        "npub",
        "name",
        "display_name",
        "website",
        "nip05",
        "lud16",
      ])
    : [];
  const profileTimestamps = profile
    ? buildMetadataEntries(profile as Record<string, unknown>, [
        "created_at",
        "updated_at",
        "last_seen",
      ])
    : [];
  const publicSummaryMetadata = summary
    ? dedupeByLabel(
        [
          ...buildMetadataEntries(
            {
              consistency: semantics.consistency,
              trust_mode: semantics.trust_mode,
              trust_applied: semantics.trust_applied,
              result_scope:
                typeof semantics.result_scope === "object" && semantics.result_scope
                  ? JSON.stringify(semantics.result_scope)
                  : semantics.result_scope,
            },
            ["consistency", "trust_mode", "trust_applied", "result_scope"]
          ),
          ...extractPrimitiveStats(summary, [
            "pubkey",
            "profile",
            "stats",
            "npub",
            "name",
            "display_name",
            "about",
            "picture",
            "website",
            "nip05",
            "lud16",
            "note_count",
            "reply_count",
            "follower_count",
            "following_count",
            "relay_count",
          ]).map((entry) => ({ label: entry.label, value: entry.value })),
        ].filter(
          (entry) =>
            entry.value !== undefined && entry.value !== null && String(entry.value).length > 0
        )
      ).slice(0, 12)
    : [];
  const headerTitle =
    profile?.display_name ??
    profile?.name ??
    profile?.npub ??
    (profile?.pubkey ? truncateMiddle(profile.pubkey, 24) : "Profile explorer");
  const errorMessage = errors.length > 0 ? errors.join(" | ") : "";
  const dedupeProfiles = (profiles: Profile[]): Profile[] =>
    Array.from(
      new Map(
        profiles.map((entry, index) => {
          const pubkey =
            typeof entry.pubkey === "string" && entry.pubkey.length > 0
              ? entry.pubkey.toLowerCase()
              : null;
          const npub =
            typeof entry.npub === "string" && entry.npub.length > 0
              ? entry.npub.toLowerCase()
              : null;
          return [pubkey ?? npub ?? `profile-${index}`, entry] as const;
        })
      ).values()
    );
  const dedupeStrings = (values: string[]): string[] =>
    Array.from(new Map(values.map((value) => [value.toLowerCase(), value] as const)).values());
  const uniqueFollowers = dedupeProfiles(followers).slice(0, 8);
  const uniqueMentions = dedupeProfiles(mentions).slice(0, 8);
  const uniqueRelatedProfiles = dedupeProfiles(relatedProfiles).slice(0, 8);
  const uniqueContactProfiles = dedupeProfiles(contactProfiles).slice(0, 8);
  const uniqueInterestProfiles = dedupeProfiles(interestProfiles).slice(0, 8);
  const uniqueContactRelays = dedupeStrings(contactRelayHints).slice(0, 8);
  const contactListScopeMetadata = dedupeByLabel(
    extractPrimitiveStats(contactListPayload, [
      "contacts",
      "relays",
      "contact_pubkeys",
      "meta",
    ]).map((entry) => ({
      label: entry.label,
      value: entry.value,
    }))
  ).slice(0, 6);
  const relayListScopeMetadata = dedupeByLabel(
    extractPrimitiveStats(relayListPayload, ["relays", "meta"]).map((entry) => ({
      label: entry.label,
      value: entry.value,
    }))
  ).slice(0, 6);
  const notesAuthorMap =
    profile?.pubkey && profile.pubkey.length > 0
      ? { [profile.pubkey.toLowerCase()]: profile }
      : undefined;
  const firstAuthoredNoteId = typeof notes[0]?.id === "string" ? notes[0].id : undefined;
  const heroIdentifier = profile?.npub || profile?.pubkey || null;

  return (
    <div className="space-y-8">
      <PageHero
        title={headerTitle}
        subtitle={
          profile?.about ?? "View identity, activity, and network context for this profile."
        }
        badges={
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <NativeSemanticsBadges semantics={semantics} />
            {heroIdentifier ? (
              <IdBadge id={heroIdentifier} label={heroIdentifier.startsWith("npub") ? "npub" : "pubkey"} />
            ) : null}
            <Timestamp
              unixSeconds={
                typeof profile?.last_seen === "number"
                  ? profile.last_seen
                  : typeof summary?.recent_activity_at === "number"
                    ? summary.recent_activity_at
                    : undefined
              }
            />
          </div>
        }
      />

      {errorMessage ? <ErrorPanel message={errorMessage} /> : null}

      <SectionCard
        title="Discovery loops"
        description="Move from this profile into the views around it."
      >
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-zinc-400">
          <Link
            href="/discovery/profiles/rising"
            className="text-zinc-300 hover:text-zinc-100"
          >
            Open rising profiles
          </Link>
          <span className="text-zinc-600">•</span>
          <Link
            href="/discovery/conversations/hot"
            className="text-zinc-300 hover:text-zinc-100"
          >
            Open hot conversations
          </Link>
          {firstAuthoredNoteId ? (
            <>
              <span className="text-zinc-600">•</span>
              <Link
                href={`/notes/${encodeURIComponent(firstAuthoredNoteId)}`}
                className="text-zinc-300 hover:text-zinc-100"
              >
                Open latest authored note
              </Link>
            </>
          ) : null}
        </div>
      </SectionCard>

      {profile ? (
        <SectionCard title="Profile header" description="Core identity details for this profile.">
          <ProfileCard profile={profile} summary={isRecord(summary) ? summary : undefined} />
        </SectionCard>
      ) : null}

      {counters.length > 0 ? (
        <section className="space-y-3">
          <p className="text-sm font-medium text-zinc-300">Counters</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {counters.map((stat) => (
              <StatCard key={stat.label} label={stat.label} value={stat.value} />
            ))}
          </div>
        </section>
      ) : null}

      {authorActivityStatCards.length > 0 || authorActivityMetadata.length > 0 ? (
        <SectionCard
          title="Author activity analytics"
          description="Activity metrics returned for this profile."
        >
          {authorActivityStatCards.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {authorActivityStatCards.map((stat) => (
                <StatCard key={stat.label} label={stat.label} value={stat.value} />
              ))}
            </div>
          ) : null}
          {authorActivityMetadata.length > 0 ? (
            <div className={authorActivityStatCards.length > 0 ? "mt-4" : undefined}>
              <MetadataList items={authorActivityMetadata} columns={2} />
            </div>
          ) : null}
        </SectionCard>
      ) : null}

      {postingBehaviorStatCards.length > 0 || postingBehaviorMetadata.length > 0 ? (
        <SectionCard
          title="Posting and reply behavior"
          description="Posting and reply patterns returned for this profile."
        >
          {postingBehaviorStatCards.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {postingBehaviorStatCards.map((stat) => (
                <StatCard key={stat.label} label={stat.label} value={stat.value} />
              ))}
            </div>
          ) : null}
          {postingBehaviorMetadata.length > 0 ? (
            <div className={postingBehaviorStatCards.length > 0 ? "mt-4" : undefined}>
              <MetadataList items={postingBehaviorMetadata} columns={2} />
            </div>
          ) : null}
        </SectionCard>
      ) : null}

      {trustScoreValue !== undefined || trustMetadata.length > 0 ? (
        <SectionCard
          title="Trust signals"
          description="Trust score and related metadata returned for this profile."
        >
          {trustScoreValue !== undefined ? (
            <div className="grid gap-3 sm:max-w-sm">
              <StatCard
                label={
                  typeof trustScoreFromSummary?.label === "string"
                    ? trustScoreFromSummary.label
                    : "trust_score"
                }
                value={trustScoreValue}
              />
            </div>
          ) : null}
          {trustMetadata.length > 0 ? (
            <div className={trustScoreValue !== undefined ? "mt-4" : undefined}>
              <MetadataList items={trustMetadata} columns={2} />
            </div>
          ) : null}
        </SectionCard>
      ) : null}

      {details.length > 0 ? (
        <SectionCard
          title="Identity metadata"
          description="Identifiers and public metadata for this profile."
        >
          <MetadataList items={details} columns={2} />
        </SectionCard>
      ) : null}

      {profileTimestamps.length > 0 ? (
        <SectionCard title="Freshness" description="Timestamps returned for this profile.">
          <MetadataList items={profileTimestamps} columns={2} />
        </SectionCard>
      ) : null}

      <div id="authored-notes">
        {notes.length > 0 ? (
          <SectionCard title="Authored notes" description="Recent notes from this profile.">
            <NotesList notes={notes} authorsByPubkey={notesAuthorMap} />
            {typeof notesNextCursor === "string" && notesNextCursor.length > 0 ? (
              <div className="mt-4 rounded-md border border-indigo-500/30 bg-indigo-500/10 p-3">
                <p className="text-xs text-indigo-100">More notes are available.</p>
                <Link
                  href={notesContinuationHref}
                  className="mt-2 inline-block text-xs text-indigo-200 hover:text-indigo-100"
                >
                  Continue notes
                </Link>
              </div>
            ) : null}
          </SectionCard>
        ) : (
          <SectionCard title="Authored notes" description="Recent notes from this profile.">
            <EmptyState message="No authored notes were returned for this profile." />
          </SectionCard>
        )}
      </div>

      {replies.length > 0 ? (
        <SectionCard title="Authored replies" description="Recent replies from this profile.">
          <NotesList notes={replies} authorsByPubkey={notesAuthorMap} />
          {typeof repliesNextCursor === "string" && repliesNextCursor.length > 0 ? (
            <div className="mt-4 rounded-md border border-indigo-500/30 bg-indigo-500/10 p-3">
              <p className="text-xs text-indigo-100">More replies are available.</p>
              <Link
                href={repliesContinuationHref}
                className="mt-2 inline-block text-xs text-indigo-200 hover:text-indigo-100"
              >
                Continue replies
              </Link>
            </div>
          ) : null}
        </SectionCard>
      ) : null}

      {replies.length === 0 ? (
        <SectionCard title="Authored replies" description="Recent replies from this profile.">
          <EmptyState message="No authored replies were returned for this profile." />
        </SectionCard>
      ) : null}

      <SectionCard title="Followers" description="Profiles following this account.">
        {uniqueFollowers.length > 0 ? (
          <>
            <ProfilesList profiles={uniqueFollowers} />
            {typeof followersNextCursor === "string" && followersNextCursor.length > 0 ? (
              <Link
                href={followersContinuationHref}
                className="mt-3 inline-block text-sm text-indigo-300"
              >
                Continue followers
              </Link>
            ) : null}
          </>
        ) : (
          <EmptyState message="No followers were returned for this profile." />
        )}
      </SectionCard>

      <SectionCard
        title="Mentions"
        description="Profiles that mention or frequently overlap with this one."
      >
        {uniqueMentions.length > 0 ? (
          <>
            <ProfilesList profiles={uniqueMentions} />
            {typeof mentionsNextCursor === "string" && mentionsNextCursor.length > 0 ? (
              <Link
                href={mentionsContinuationHref}
                className="mt-3 inline-block text-sm text-indigo-300"
              >
                Continue mentions
              </Link>
            ) : null}
          </>
        ) : (
          <EmptyState message="No mentions were returned for this profile." />
        )}
      </SectionCard>

      <div id="related-profiles">
        <SectionCard
          title="Related profiles"
          description="Profiles connected to this one by network or behavior."
        >
          {uniqueRelatedProfiles.length > 0 ? (
            <>
              <ProfilesList profiles={uniqueRelatedProfiles} />
              {typeof relatedProfilesNextCursor === "string" &&
              relatedProfilesNextCursor.length > 0 ? (
                <Link
                  href={relatedProfilesContinuationHref}
                  className="mt-3 inline-block text-sm text-indigo-300"
                >
                  Continue related profiles
                </Link>
              ) : null}
            </>
          ) : (
            <EmptyState message="No related profiles were returned for this account yet." />
          )}
        </SectionCard>
      </div>

      <SectionCard
        title="Contact list context"
        description="Public contact relationships and relay hints for this profile."
      >
        {uniqueContactProfiles.length > 0 ? (
          <ProfilesList profiles={uniqueContactProfiles} />
        ) : null}
        {uniqueContactRelays.length > 0 ? (
          <div className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-zinc-400">
            {uniqueContactRelays.map((relay, index) => (
              <span key={relay} className="inline-flex items-center gap-2">
                {index > 0 ? <span className="text-zinc-600">•</span> : null}
                <Link href={`/relays/${encodeURIComponent(relay)}`} className="text-zinc-300 hover:text-zinc-100">
                  {relay}
                </Link>
              </span>
            ))}
          </div>
        ) : null}
        {contactListScopeMetadata.length > 0 ? (
          <div className="mt-4">
            <MetadataList items={contactListScopeMetadata} columns={2} />
          </div>
        ) : null}
        {uniqueContactProfiles.length === 0 &&
        uniqueContactRelays.length === 0 &&
        contactListScopeMetadata.length === 0 ? (
          <EmptyState message="No contact list data was available for this profile." />
        ) : null}
      </SectionCard>

      <SectionCard
        title="Relay list context"
        description="Relays this profile publishes and where to follow up."
      >
        {relayEntries.length > 0 ? (
          <ul className="space-y-2">
            {relayEntries.slice(0, 12).map((relayEntry, index) => {
              const relay = relayLabel(relayEntry);
              if (!relay) return null;
              const readFlag = typeof relayEntry.read === "boolean" ? relayEntry.read : undefined;
              const writeFlag =
                typeof relayEntry.write === "boolean" ? relayEntry.write : undefined;
              return (
                <li
                  key={`${relay}-${index}`}
                  className="flex flex-wrap items-center gap-2 rounded-md border border-zinc-800 bg-zinc-900/45 px-3 py-2 text-xs"
                >
                  <Link
                    href={`/relays/${encodeURIComponent(relay)}`}
                    className="text-indigo-300 hover:text-indigo-200"
                  >
                    {relay}
                  </Link>
                  {readFlag !== undefined ? (
                    <span className="text-zinc-500">
                      read: {readFlag ? "yes" : "no"}
                    </span>
                  ) : null}
                  {writeFlag !== undefined ? (
                    <span className="text-zinc-500">
                      write: {writeFlag ? "yes" : "no"}
                    </span>
                  ) : null}
                </li>
              );
            })}
          </ul>
        ) : null}
        {relayListScopeMetadata.length > 0 ? (
          <div className="mt-4">
            <MetadataList items={relayListScopeMetadata} columns={2} />
          </div>
        ) : null}
        {relayEntries.length === 0 && relayListScopeMetadata.length === 0 ? (
          <EmptyState message="No relay list data was available for this profile." />
        ) : null}
      </SectionCard>

      <SectionCard
        title="Topic and interest context"
        description="Topics and interests linked to this profile."
      >
        {interestTopics.length > 0 ? (
          <div className="space-y-2">
            <p className="text-xs font-medium tracking-wide text-zinc-400 uppercase">Topics</p>
            <HashtagsList hashtags={interestTopics.slice(0, 12)} searchable />
          </div>
        ) : null}
        {uniqueInterestProfiles.length > 0 ? (
          <div className="mt-4 space-y-2">
            <p className="text-xs font-medium tracking-wide text-zinc-400 uppercase">
              Related interest profiles
            </p>
            <ProfilesList profiles={uniqueInterestProfiles} />
          </div>
        ) : null}
        {interestTopics.length === 0 && uniqueInterestProfiles.length === 0 ? (
          <EmptyState message="No topic or interest data was available for this profile." />
        ) : null}
      </SectionCard>

      {publicSummaryMetadata.length > 0 ? (
        <SectionCard
          title="Public summary metadata"
          description="Additional public fields returned with the profile summary."
        >
          <MetadataList items={publicSummaryMetadata} columns={2} />
        </SectionCard>
      ) : null}

      <div className="space-y-3">
        <DebugDisclosure title="Debug payload: profile summary" data={summary ?? {}} />
        <DebugDisclosure title="Debug payload: profile enrichment" data={profileEnrichment ?? {}} />
        <DebugDisclosure title="Debug payload: authored notes" data={authoredEventsPayload ?? {}} />
        <DebugDisclosure
          title="Debug payload: authored replies"
          data={authoredRepliesPayload ?? {}}
        />
        <DebugDisclosure title="Debug payload: followers" data={followersPayload ?? {}} />
        <DebugDisclosure title="Debug payload: mentions" data={mentionsPayload ?? {}} />
        <DebugDisclosure
          title="Debug payload: related profiles"
          data={relatedProfilesPayload ?? {}}
        />
        <DebugDisclosure title="Debug payload: contact list" data={contactListPayload ?? {}} />
        <DebugDisclosure title="Debug payload: relay list" data={relayListPayload ?? {}} />
        <DebugDisclosure title="Debug payload: profile topics" data={profileTopicsPayload ?? {}} />
        <DebugDisclosure
          title="Debug payload: author activity analytics"
          data={authorActivityAnalyticsPayload ?? {}}
        />
        <DebugDisclosure
          title="Debug payload: posting behavior analytics"
          data={postingBehaviorAnalyticsPayload ?? {}}
        />
        <DebugDisclosure title="Debug payload: trust score" data={trustScorePayload ?? {}} />
      </div>
    </div>
  );
}
*/
