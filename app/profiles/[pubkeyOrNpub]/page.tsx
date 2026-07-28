import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ArticlesList, NotesList, ProfilesList } from "@/components/data/renderers";
import { ProfileActivityTabs } from "@/components/profile/profile-activity-tabs";
import {
  ProfileReactionsActivityList,
  ProfileZapsActivityList,
} from "@/components/profile/profile-engagement-activity-list";
import { DebugDisclosure } from "@/components/explorer/debug-disclosure";
import { EmptyState } from "@/components/explorer/empty-state";
import { IdBadge } from "@/components/explorer/id-badge";
import { NativeSemanticsBadges } from "@/components/explorer/native-semantics-badges";
import {
  isRecord,
  normalizeImageSrc,
  profileFallbackAvatarDataUrl,
  profileLabel,
  profilePictureUrl,
  sanitizeExternalHref,
  truncateMiddle,
} from "@/components/explorer/utils";
import { CopyValueButton } from "@/components/actions/copy-value-button";
import { EntityActions } from "@/components/actions/entity-actions";
import { JsonLd } from "@/components/seo/json-ld";
import { Disclosure } from "@/components/ui/disclosure";
import { SectionCard } from "@/components/ui/section-card";
import { ErrorPanel } from "@/components/ui/status-panels";
import { hexToNpub } from "@/lib/nostr/nip19";
import { buildProfileActivityTabHref, type ProfileActivityTab } from "@/lib/profile/activity-tabs";
import { getProfileSummaryCached, loadProfilePageData } from "@/lib/profile/load-profile-page-data";
import { isValidPubkeyOrNpubParam, resolvePubkeyParam } from "@/lib/routing/params";
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

function activityEmptyMessage(tab: ProfileActivityTab): string {
  switch (tab) {
    case "notes":
      return "No recent notes were returned for this profile.";
    case "replies":
      return "No recent replies were returned for this profile.";
    case "reactions":
      return "No recent reactions were returned for this profile.";
    case "zaps":
      return "No recent zaps were returned for this profile.";
    case "long_form":
      return "No long-form articles were returned for this profile.";
    case "bookmarks":
      return "No bookmarks were returned for this profile.";
    case "highlights":
      return "No highlights were returned for this profile.";
    case "mute_list":
      return "This profile's mute list is empty or unavailable.";
    case "muted_by":
      return "No accounts muting this profile were returned.";
  }
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
  const {
    activityTab,
    activityTabs,
    activeContinuationHref,
    activeNextCursor,
    activeTabMeta,
    authoredNotesPayload,
    authoredReactionsPayload,
    authoredRepliesPayload,
    authoredZapsPayload,
    bookmarks,
    bookmarksPayload,
    currentSearchParams,
    errorMessage,
    eventListAuthorsByPubkey,
    highlights,
    highlightsPayload,
    longFormArticles,
    longFormPayload,
    lookupKey,
    muteListPayload,
    mutedByPayload,
    mutedByProfiles,
    mutedProfiles,
    notes,
    notesAuthorMap,
    profile,
    profileEnrichment,
    profileRoute,
    reactions,
    relatedProfiles,
    relatedProfilesContinuationHref,
    relatedProfilesFallbackPayload,
    relatedProfilesNextCursor,
    replies,
    risingProfiles,
    risingProfilesPayload,
    semantics,
    summary,
    summaryRecord,
    targetNoteAuthorsByPubkey,
    targetNotesById,
    zaps,
  } = await loadProfilePageData(pubkeyOrNpub, resolvedSearchParams);

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
  const avatar =
    normalizeImageSrc(typeof hero?.avatar === "string" ? hero.avatar : undefined) ??
    (profile ? profilePictureUrl(profile) : null) ??
    (profile
      ? profileFallbackAvatarDataUrl(profile)
      : profileFallbackAvatarDataUrl({ pubkey: lookupKey }));

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
              className="border-edge-strong h-16 w-16 rounded-full border object-cover sm:h-[72px] sm:w-[72px]"
            />
            <div className="min-w-0 flex-1 space-y-1">
              <p className="text-ink truncate text-xl font-semibold tracking-tight">
                {heroDisplayName}
              </p>
              {heroHandle ? <p className="text-ink-muted truncate text-sm">{heroHandle}</p> : null}
              <p className="text-ink-dim text-sm leading-6">{heroBio}</p>
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
                rel="noopener noreferrer nofollow"
                target="_blank"
                className="border-edge-strong bg-surface/80 text-ink-dim hover:text-ink rounded-full border px-2 py-1"
              >
                {heroWebsite.display ?? truncateMiddle(heroWebsite.raw, 28)}
              </Link>
            ) : null}
            {heroLud16?.raw ? (
              <a
                href={`lightning:${heroLud16.raw}`}
                className="border-edge-strong bg-surface/80 text-ink-dim hover:text-ink rounded-full border px-2 py-1"
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
                  className="border-edge-strong bg-surface/80 text-ink-dim rounded-full border px-3 py-1.5 text-xs"
                >
                  <span className="text-ink-faint mr-2">{counter.label}</span>
                  <span className="text-ink font-medium">{counter.value}</span>
                </div>
              ))}
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2 text-xs">
            {heroActions.map((action) => (
              <Link
                key={action.id}
                href={action.href}
                className="border-edge-strong text-ink-dim hover:text-ink rounded-full border px-2.5 py-1"
              >
                {action.label}
              </Link>
            ))}
          </div>

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
      </SectionCard>

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

      <div id="profile-activity">
        <SectionCard
          title="Recent activity"
          description="Browse this profile's latest notes, replies, reactions, and zaps."
        >
          <div className="space-y-4">
            <ProfileActivityTabs activeTab={activityTab} tabs={activityTabs} />
            {activityTab === "notes" ? (
              notes.length > 0 ? (
                <NotesList notes={notes} authorsByPubkey={notesAuthorMap} />
              ) : (
                <EmptyState message={activityEmptyMessage("notes")} />
              )
            ) : null}
            {activityTab === "replies" ? (
              replies.length > 0 ? (
                <NotesList notes={replies} authorsByPubkey={notesAuthorMap} />
              ) : (
                <EmptyState message={activityEmptyMessage("replies")} />
              )
            ) : null}
            {activityTab === "reactions" ? (
              reactions.length > 0 ? (
                <ProfileReactionsActivityList
                  reactions={reactions}
                  targetNotesById={targetNotesById}
                  authorsByPubkey={{ ...notesAuthorMap, ...targetNoteAuthorsByPubkey }}
                />
              ) : (
                <EmptyState message={activityEmptyMessage("reactions")} />
              )
            ) : null}
            {activityTab === "zaps" ? (
              zaps.length > 0 ? (
                <ProfileZapsActivityList
                  zaps={zaps}
                  targetNotesById={targetNotesById}
                  authorsByPubkey={{ ...notesAuthorMap, ...targetNoteAuthorsByPubkey }}
                />
              ) : (
                <EmptyState message={activityEmptyMessage("zaps")} />
              )
            ) : null}
            {activityTab === "long_form" ? (
              longFormArticles.length > 0 ? (
                <ArticlesList
                  articles={longFormArticles}
                  authorsByPubkey={{ ...notesAuthorMap, ...eventListAuthorsByPubkey }}
                />
              ) : (
                <EmptyState message={activityEmptyMessage("long_form")} />
              )
            ) : null}
            {activityTab === "bookmarks" ? (
              bookmarks.length > 0 ? (
                <NotesList
                  notes={bookmarks}
                  authorsByPubkey={{ ...notesAuthorMap, ...eventListAuthorsByPubkey }}
                />
              ) : (
                <EmptyState message={activityEmptyMessage("bookmarks")} />
              )
            ) : null}
            {activityTab === "highlights" ? (
              highlights.length > 0 ? (
                <NotesList
                  notes={highlights}
                  authorsByPubkey={{ ...notesAuthorMap, ...eventListAuthorsByPubkey }}
                />
              ) : (
                <EmptyState message={activityEmptyMessage("highlights")} />
              )
            ) : null}
            {activityTab === "mute_list" ? (
              mutedProfiles.length > 0 ? (
                <ProfilesList profiles={mutedProfiles} />
              ) : (
                <EmptyState message={activityEmptyMessage("mute_list")} />
              )
            ) : null}
            {activityTab === "muted_by" ? (
              mutedByProfiles.length > 0 ? (
                <ProfilesList profiles={mutedByProfiles} />
              ) : (
                <EmptyState message={activityEmptyMessage("muted_by")} />
              )
            ) : null}
            {typeof activeNextCursor === "string" && activeNextCursor.length > 0 ? (
              <div className="border-accent/30 bg-accent/10 rounded-md border p-3">
                <p className="text-accent-ink text-xs">
                  More {activeTabMeta?.label.toLowerCase() ?? "activity"} are available.
                </p>
                <Link
                  href={activeContinuationHref}
                  className="border-accent/40 text-link-hover hover:text-accent-ink mt-2 inline-block rounded-full border px-3 py-1 text-xs"
                >
                  Continue {activeTabMeta?.label.toLowerCase() ?? "activity"}
                </Link>
              </div>
            ) : null}
          </div>
        </SectionCard>
      </div>

      <div id="related-profiles">
        <SectionCard
          title="Related discovery"
          description="Connected profiles and rising discovery surfaces related to this profile."
        >
          <div className="space-y-5">
            <div className="space-y-2">
              <p className="text-ink-muted text-xs font-medium">Related profiles</p>
              {relatedProfiles.length > 0 ? (
                <>
                  <ProfilesList profiles={relatedProfiles.slice(0, 8)} />
                  {typeof relatedProfilesNextCursor === "string" &&
                  relatedProfilesNextCursor.length > 0 ? (
                    <Link
                      href={relatedProfilesContinuationHref}
                      className="text-link inline-block text-sm"
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
              <p className="text-ink-muted text-xs font-medium">Rising profiles</p>
              {risingProfiles.length > 0 ? (
                <ProfilesList profiles={risingProfiles.slice(0, 8)} />
              ) : (
                <EmptyState message="No rising profiles are available right now." />
              )}
            </div>
          </div>
        </SectionCard>
      </div>

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

      <div className="space-y-3">
        <DebugDisclosure title="Debug payload: profile summary" data={summary ?? {}} />
        <DebugDisclosure title="Debug payload: profile enrichment" data={profileEnrichment ?? {}} />
        <DebugDisclosure title="Debug payload: authored notes" data={authoredNotesPayload ?? {}} />
        <DebugDisclosure
          title="Debug payload: authored replies"
          data={authoredRepliesPayload ?? {}}
        />
        <DebugDisclosure
          title="Debug payload: authored reactions"
          data={authoredReactionsPayload ?? {}}
        />
        <DebugDisclosure title="Debug payload: authored zaps" data={authoredZapsPayload ?? {}} />
        <DebugDisclosure title="Debug payload: long-form" data={longFormPayload ?? {}} />
        <DebugDisclosure title="Debug payload: bookmarks" data={bookmarksPayload ?? {}} />
        <DebugDisclosure title="Debug payload: highlights" data={highlightsPayload ?? {}} />
        <DebugDisclosure title="Debug payload: mute list" data={muteListPayload ?? {}} />
        <DebugDisclosure title="Debug payload: muted by" data={mutedByPayload ?? {}} />
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
