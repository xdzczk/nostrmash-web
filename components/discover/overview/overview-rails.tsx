import Link from "@/components/app-link";

import { articleCoverSrc, getArticlePresentation } from "@/components/explorer/article-meta";
import type { NoteContentResolution } from "@/components/explorer/note-content";
import { getEditorialNoteText } from "@/components/explorer/note-preview";
import { ProfileAvatar } from "@/components/explorer/profile-avatar";
import { VideoStill } from "@/components/explorer/video-still";
import {
  extractZapMsats,
  formatCompactNumber,
  formatSatsFromMsats,
  noteAuthorIdentifier,
  noteInlineAuthorProfile,
  postEngagementStats,
  profileHref,
  profileLabel,
  truncateProfileLabel,
} from "@/components/explorer/utils";
import { BlossomImage } from "@/components/ui/blossom-image";
import { mergeHydratedProfile } from "@/lib/api/profile-hydration";
import { parseYoutubeVideoId } from "@/lib/notes/embeds";
import type { HomeMover } from "@/lib/home/load-home-rails";
import { MEDIA_RANKINGS, type MediaLeaders } from "@/lib/discover/media-rankings";
import { rankMovement } from "@/lib/discover/reasons";
import { buildDiscoverHref } from "@/lib/search-params/language";
import { eventPageHref } from "@/lib/notes/kinds";
import { getLivePresentation } from "@/lib/notes/live-activity";
import { getMediaPresentation } from "@/lib/notes/media-event";
import type { StatsWindow } from "@/lib/search-params/window";
import type { EventRecord, Profile } from "@/lib/types/api";

type FormatKey = "pictures" | "videos" | "shorts" | "article";

type FormatEntry = {
  key: FormatKey;
  label: string;
  path: string;
  event: EventRecord;
};

const THUMB: Record<FormatKey, string> = {
  pictures: "h-16 w-16",
  videos: "h-16 w-[7.1rem]",
  shorts: "h-16 w-11",
  article: "h-16 w-24",
};

const LEAD_ORDER: FormatKey[] = ["pictures", "videos", "shorts", "article"];

function httpsUrl(value: string | undefined): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

function authorProfile(
  event: EventRecord,
  authorsByPubkey: Record<string, Profile>
): Profile | null {
  const pubkey = typeof event.pubkey === "string" ? event.pubkey.trim() : "";
  const key = pubkey.toLowerCase();
  const hydrated = key ? (authorsByPubkey[key] ?? authorsByPubkey[pubkey]) : undefined;
  const inline = noteInlineAuthorProfile(event);
  if (inline && hydrated) return mergeHydratedProfile(inline, hydrated);
  if (hydrated) return hydrated;
  if (inline) return inline;
  if (pubkey) return { pubkey };
  return null;
}

function authorLabel(event: EventRecord, authorsByPubkey: Record<string, Profile>): string {
  const author = authorProfile(event, authorsByPubkey);
  return author ? profileLabel(author) : noteAuthorIdentifier(event);
}

function AuthorFace({
  event,
  authorsByPubkey,
  size = 32,
}: {
  event: EventRecord;
  authorsByPubkey: Record<string, Profile>;
  size?: number;
}) {
  const profile = authorProfile(event, authorsByPubkey);
  if (!profile) return null;
  const box = size <= 20 ? "h-5 w-5" : "h-8 w-8";
  return (
    <ProfileAvatar
      profile={profile}
      size={size}
      alt={profileLabel(profile)}
      href={profileHref(profile, typeof event.pubkey === "string" ? event.pubkey : undefined)}
      className={`border-edge ${box} shrink-0 rounded-full border object-cover`}
    />
  );
}

function countLabel(count: number, singular: string, plural: string): string {
  return `${formatCompactNumber(count)} ${count === 1 ? singular : plural}`;
}

function readableLine(value: string): string {
  const text = value.replace(/\s+/g, " ").trim();
  if (!text || text === "(no content)") return "";
  return text;
}

function attentionMetric(event: EventRecord): string | null {
  const stats = postEngagementStats(event);
  const reactions = stats.find((stat) => stat.label === "reaction_count")?.value ?? 0;
  const replies = stats.find((stat) => stat.label === "reply_count")?.value ?? 0;
  const sats = formatSatsFromMsats(extractZapMsats(event));
  if (reactions > 0) return countLabel(reactions, "reaction", "reactions");
  if (sats) return sats;
  if (replies > 0) return countLabel(replies, "reply", "replies");
  return null;
}

function Movement({ ranking }: { ranking?: EventRecord["ranking"] }) {
  const movement = rankMovement(ranking);
  if (!movement) return <span className="inline-block w-10 shrink-0" />;
  const up = movement.direction === "up";
  return (
    <span
      className={`inline-flex w-10 shrink-0 items-center justify-end gap-0.5 text-xs font-medium tabular-nums ${
        up ? "text-accent-ink" : "text-ink-faint"
      }`}
      aria-label={`${up ? "Up" : "Down"} ${movement.places} ${movement.places === 1 ? "place" : "places"}`}
    >
      <span aria-hidden>{up ? "↑" : "↓"}</span>
      {movement.places}
    </span>
  );
}

function formatEntries(leaders: MediaLeaders, article?: EventRecord): FormatEntry[] {
  const entries: FormatEntry[] = [];
  for (const ranking of MEDIA_RANKINGS) {
    const event = leaders[ranking.format];
    if (!event) continue;
    entries.push({
      key: ranking.format,
      label: ranking.label,
      path: ranking.path,
      event,
    });
  }
  if (article) {
    entries.push({
      key: "article",
      label: "Articles",
      path: "/trending/long-form",
      event: article,
    });
  }
  return entries;
}

function youtubePoster(url: string | undefined): string | undefined {
  if (!url) return undefined;
  const id = parseYoutubeVideoId(url);
  return id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : undefined;
}

function formatArt(
  entry: FormatEntry,
  resolution?: NoteContentResolution
): { src?: string; videoUrl?: string; alt: string; title: string } {
  if (entry.key === "article") {
    const presentation = getArticlePresentation(entry.event);
    return {
      src: articleCoverSrc(entry.event),
      alt: presentation.title,
      title: presentation.title,
    };
  }
  const media = getMediaPresentation(entry.event);
  const text = readableLine(getEditorialNoteText(entry.event, resolution));
  const title = media?.title || text;
  const poster =
    httpsUrl(media?.posterUrl ?? media?.images[0]?.url) ?? youtubePoster(media?.videoUrl);
  return {
    src: poster,
    videoUrl: poster ? undefined : httpsUrl(media?.videoUrl),
    alt: media?.images[0]?.alt || title || entry.label,
    title,
  };
}

function FormatFrame({
  src,
  videoUrl,
  alt,
  className,
  priority = false,
  article = false,
}: {
  src?: string;
  videoUrl?: string;
  alt: string;
  className: string;
  priority?: boolean;
  article?: boolean;
}) {
  return (
    <div className={`bg-surface-sunken relative overflow-hidden rounded-sm ${className}`}>
      {src ? (
        <BlossomImage
          src={src}
          alt={alt}
          displayWidth={priority ? 960 : 96}
          loading={priority ? "eager" : "lazy"}
          fetchPriority={priority ? "high" : "low"}
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <>
          <span
            className={`absolute inset-0 grid place-items-center ${
              article ? "text-ink-faint font-display text-lg" : "text-ink-faint text-sm"
            }`}
            aria-hidden
          >
            {article ? "Aa" : "▶"}
          </span>
          {/* The still covers the mark once a frame is ready. */}
          {videoUrl ? (
            <VideoStill url={videoUrl} className="absolute inset-0 h-full w-full object-cover" />
          ) : null}
        </>
      )}
    </div>
  );
}

function RailHeader({
  kicker,
  title,
  headingId,
  action,
  compact = false,
  lede,
}: {
  kicker: string;
  title: string;
  headingId: string;
  action?: { href: string; label: string };
  compact?: boolean;
  lede?: string;
}) {
  return (
    <div className="min-w-0">
      <div className="flex min-w-0 flex-wrap items-end justify-between gap-x-3 gap-y-1">
        <div className="min-w-0">
          <p className="nm-kicker">{kicker}</p>
          <h2
            id={headingId}
            className={`text-ink mt-2 ${
              compact ? "font-display text-[1.35rem] leading-tight tracking-[-0.03em]" : "nm-title"
            }`}
          >
            {title}
          </h2>
        </div>
        {action ? (
          <Link href={action.href} className="nm-action-link mb-1 shrink-0">
            {action.label}
          </Link>
        ) : null}
      </div>
      {lede ? <p className="text-ink-muted mt-2 text-sm leading-5">{lede}</p> : null}
    </div>
  );
}

export function FormatLeaders({
  leaders,
  article,
  authorsByPubkey,
  window,
  lang,
  viewer,
  contentResolution,
}: {
  leaders: MediaLeaders;
  article?: EventRecord;
  authorsByPubkey: Record<string, Profile>;
  window: StatsWindow;
  lang?: string;
  viewer?: string;
  contentResolution?: NoteContentResolution;
}) {
  const entries = formatEntries(leaders, article);
  if (entries.length === 0) return null;
  const lead =
    LEAD_ORDER.map((key) => entries.find((entry) => entry.key === key)).find(Boolean) ??
    entries[0]!;
  const rest = entries.filter((entry) => entry !== lead);
  const leadArt = formatArt(lead, contentResolution);
  const leadHref = eventPageHref(lead.event);
  const leadMetric = attentionMetric(lead.event);

  return (
    <section aria-labelledby="media-leaders" className="min-w-0">
      <h2 id="media-leaders" className="nm-kicker scroll-mt-24">
        Leading each format
      </h2>
      <div
        className={`mt-4 grid min-w-0 items-start gap-8 ${
          rest.length > 0
            ? "lg:grid-cols-[minmax(16rem,0.72fr)_minmax(0,1.45fr)] lg:items-stretch lg:gap-12"
            : ""
        }`}
      >
        {rest.length > 0 ? (
          <div className="order-2 flex min-w-0 flex-col gap-5 lg:order-1 lg:h-full lg:justify-between lg:gap-4">
            {rest.map((entry) => {
              const art = formatArt(entry, contentResolution);
              const href = eventPageHref(entry.event);
              const metric = attentionMetric(entry.event);
              return (
                <article key={entry.key} className="flex min-w-0 items-center gap-3">
                  {href ? (
                    <Link
                      href={href}
                      className="shrink-0"
                      aria-label={art.title || `Open ${entry.label.toLowerCase()}`}
                    >
                      <FormatFrame
                        src={art.src}
                        videoUrl={art.videoUrl}
                        alt=""
                        article={entry.key === "article"}
                        className={THUMB[entry.key]}
                      />
                    </Link>
                  ) : (
                    <FormatFrame
                      src={art.src}
                      videoUrl={art.videoUrl}
                      alt=""
                      article={entry.key === "article"}
                      className={`shrink-0 ${THUMB[entry.key]}`}
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-3">
                      <h3 className="nm-kicker">{entry.label}</h3>
                      <Link
                        href={buildDiscoverHref(entry.path, { window, lang, viewer })}
                        className="nm-action-link"
                      >
                        Ranking
                      </Link>
                    </div>
                    {art.title ? (
                      href ? (
                        <Link
                          href={href}
                          className="text-ink mt-1 block truncate text-sm font-medium hover:underline"
                        >
                          {art.title}
                        </Link>
                      ) : (
                        <p className="text-ink mt-1 truncate text-sm font-medium">{art.title}</p>
                      )
                    ) : null}
                    <p className="nm-meta mt-0.5 flex min-w-0 items-center gap-1.5">
                      <AuthorFace event={entry.event} authorsByPubkey={authorsByPubkey} />
                      <span className="truncate">
                        {truncateProfileLabel(authorLabel(entry.event, authorsByPubkey))}
                        {metric ? ` · ${metric}` : ""}
                      </span>
                    </p>
                  </div>
                </article>
              );
            })}
          </div>
        ) : null}
        <article className={rest.length > 0 ? "order-1 min-w-0 lg:order-2" : "min-w-0"}>
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="nm-kicker">{lead.label}</h3>
            <Link
              href={buildDiscoverHref(lead.path, { window, lang, viewer })}
              className="nm-action-link"
            >
              Ranking
            </Link>
          </div>
          {leadHref ? (
            <Link
              href={leadHref}
              className="block"
              aria-label={leadArt.title || `Open ${lead.label.toLowerCase()}`}
            >
              <FormatFrame
                src={leadArt.src}
                videoUrl={leadArt.videoUrl}
                alt={leadArt.alt}
                className="relative aspect-[2.4/1]"
                priority
              />
            </Link>
          ) : (
            <FormatFrame
              src={leadArt.src}
              videoUrl={leadArt.videoUrl}
              alt={leadArt.alt}
              className="relative aspect-[2.4/1]"
              priority
            />
          )}
          {leadArt.title ? (
            leadHref ? (
              <Link
                href={leadHref}
                className="text-ink-strong font-display mt-3 line-clamp-2 text-2xl tracking-[-0.03em] [overflow-wrap:anywhere] hover:underline"
              >
                {leadArt.title}
              </Link>
            ) : (
              <p className="text-ink-strong font-display mt-3 line-clamp-2 text-2xl tracking-[-0.03em] [overflow-wrap:anywhere]">
                {leadArt.title}
              </p>
            )
          ) : null}
          <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
            <AuthorFace event={lead.event} authorsByPubkey={authorsByPubkey} />
            <span className="text-ink-muted">
              {truncateProfileLabel(authorLabel(lead.event, authorsByPubkey))}
              {leadMetric ? ` · ${leadMetric}` : ""}
            </span>
            <Movement ranking={lead.event.ranking} />
          </p>
        </article>
      </div>
    </section>
  );
}

export function LiveStrip({
  events,
  authorsByPubkey,
}: {
  events: EventRecord[];
  authorsByPubkey: Record<string, Profile>;
}) {
  const items = events.slice(0, 2).flatMap((event) => {
    const presentation = getLivePresentation(event);
    if (!presentation) return [];
    const href = eventPageHref(event);
    const watching =
      typeof presentation.currentParticipants === "number"
        ? `${formatCompactNumber(presentation.currentParticipants)} watching`
        : "Live now";
    return [
      {
        key: event.id ?? presentation.title,
        event,
        title: presentation.title,
        href,
        detail: `${truncateProfileLabel(authorLabel(event, authorsByPubkey))} · ${watching}`,
      },
    ];
  });
  if (items.length === 0) return null;

  return (
    <section
      aria-label="Happening now"
      className="border-edge/70 flex min-w-0 flex-wrap items-center gap-x-6 gap-y-2 border-y py-3"
    >
      <h2 className="nm-kicker flex items-center gap-2">
        <span className="nm-live-dot" aria-hidden />
        Live
      </h2>
      {items.map((item) => (
        <p key={item.key} className="flex min-w-0 items-center gap-2 text-sm">
          <AuthorFace event={item.event} authorsByPubkey={authorsByPubkey} size={20} />
          {item.href ? (
            <Link href={item.href} className="text-ink font-medium hover:underline">
              {item.title}
            </Link>
          ) : (
            <span className="text-ink font-medium">{item.title}</span>
          )}
          <span className="text-ink-muted truncate">· {item.detail}</span>
        </p>
      ))}
      <Link href="/live" className="nm-action-link sm:ml-auto">
        All live
      </Link>
    </section>
  );
}

function noteLine(event: EventRecord, resolution?: NoteContentResolution): string {
  return readableLine(getEditorialNoteText(event, resolution)) || "Note";
}

export function ConversationZapRails({
  conversations,
  zapped,
  authorsByPubkey,
  window,
  lang,
  viewer,
  contentResolution,
}: {
  conversations: EventRecord[];
  zapped: EventRecord[];
  authorsByPubkey: Record<string, Profile>;
  window: StatsWindow;
  lang?: string;
  viewer?: string;
  contentResolution?: NoteContentResolution;
}) {
  if (conversations.length === 0 && zapped.length === 0) return null;
  const split = conversations.length > 0 && zapped.length > 0;
  const query = { window, lang, viewer };

  return (
    <div
      className={`grid min-w-0 items-start gap-12 lg:gap-14 ${
        split ? "lg:grid-cols-[minmax(0,1.5fr)_minmax(16rem,19rem)]" : ""
      }`}
    >
      {conversations.length > 0 ? (
        <section aria-labelledby="conversations-heading" className="min-w-0">
          <RailHeader
            kicker="Conversations"
            title="Threads still growing"
            headingId="conversations-heading"
            action={{
              href: buildDiscoverHref("/discovery/conversations/hot", query),
              label: "All conversations",
            }}
          />
          <ol className="border-edge/70 mt-5 divide-y divide-[var(--edge)] border-y">
            {conversations.map((event, index) => {
              const href = eventPageHref(event);
              const replies =
                postEngagementStats(event).find((stat) => stat.label === "reply_count")?.value ?? 0;
              const line = noteLine(event, contentResolution);
              return (
                <li key={event.id ?? index} className="flex items-center gap-3 py-3">
                  <span className="text-accent-ink w-8 shrink-0 text-lg tabular-nums">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <AuthorFace event={event} authorsByPubkey={authorsByPubkey} />
                  <div className="min-w-0 flex-1">
                    {href ? (
                      <Link
                        href={href}
                        className="text-ink line-clamp-2 font-medium hover:underline"
                      >
                        {line}
                      </Link>
                    ) : (
                      <p className="text-ink line-clamp-2 font-medium">{line}</p>
                    )}
                    <p className="nm-meta mt-0.5">
                      {truncateProfileLabel(authorLabel(event, authorsByPubkey))}
                      {replies > 0 ? ` · ${countLabel(replies, "reply", "replies")}` : ""}
                    </p>
                  </div>
                  <Movement ranking={event.ranking} />
                </li>
              );
            })}
          </ol>
        </section>
      ) : null}
      {zapped.length > 0 ? (
        <section aria-labelledby="zaps-heading" className="min-w-0">
          <RailHeader
            kicker="Zaps"
            title="Where the sats went"
            headingId="zaps-heading"
            compact
            action={{
              href: buildDiscoverHref("/discovery/notes/zapped", query),
              label: "Zapped notes",
            }}
          />
          <ol className="border-edge/70 mt-5 divide-y divide-[var(--edge)] border-y">
            {zapped.map((event, index) => {
              const href = eventPageHref(event);
              const amount = formatSatsFromMsats(extractZapMsats(event));
              const line = noteLine(event, contentResolution);
              return (
                <li key={event.id ?? index} className="py-3">
                  <div className="flex items-baseline justify-between gap-3">
                    <h3 className="nm-kicker">{String(index + 1).padStart(2, "0")}</h3>
                    <Movement ranking={event.ranking} />
                  </div>
                  {amount ? (
                    <p className="text-ink-strong font-display mt-2 text-2xl tracking-[-0.03em] tabular-nums">
                      {amount}
                    </p>
                  ) : null}
                  {href ? (
                    <Link
                      href={href}
                      className="text-ink mt-1 line-clamp-2 min-w-0 text-sm font-medium [overflow-wrap:anywhere] hover:underline"
                    >
                      {line}
                    </Link>
                  ) : (
                    <p className="text-ink mt-1 line-clamp-2 min-w-0 text-sm font-medium [overflow-wrap:anywhere]">
                      {line}
                    </p>
                  )}
                  <p className="nm-meta mt-1 flex min-w-0 items-center gap-1.5">
                    <AuthorFace event={event} authorsByPubkey={authorsByPubkey} />
                    <span className="truncate">
                      {truncateProfileLabel(authorLabel(event, authorsByPubkey))}
                    </span>
                  </p>
                </li>
              );
            })}
          </ol>
        </section>
      ) : null}
    </div>
  );
}

export function MoversColumn({ movers }: { movers: HomeMover[] }) {
  if (movers.length === 0) return null;
  return (
    <section aria-labelledby="emerging-heading" className="min-w-0">
      <RailHeader
        kicker="Movers"
        title="Moving fastest"
        headingId="emerging-heading"
        lede="Largest jump versus the recent baseline."
      />
      <ol className="border-edge/70 mt-6 divide-y divide-[var(--edge)] border-y">
        {movers.map((mover, index) => (
          <li key={mover.key} className="flex items-baseline gap-3 py-4">
            <span className="text-accent-ink w-8 shrink-0 text-lg tabular-nums">
              {String(index + 1).padStart(2, "0")}
            </span>
            <Link
              href={mover.href}
              className="text-ink min-w-0 flex-1 truncate font-medium hover:underline"
            >
              {mover.label}
            </Link>
            <span className="text-ink-muted shrink-0 text-sm tabular-nums">
              z {formatCompactNumber(mover.score)}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
