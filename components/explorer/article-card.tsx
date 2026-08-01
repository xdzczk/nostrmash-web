import Image from "next/image";
import Link from "next/link";

import {
  cardTierClassName,
  DiscoveryActionLinks,
  DiscoveryPill,
  DiscoveryStatPills,
} from "@/components/explorer/card-grammar";
import { getArticlePresentation } from "@/components/explorer/article-meta";
import { ProfileAvatar } from "@/components/explorer/profile-avatar";
import { Timestamp } from "@/components/explorer/timestamp";
import {
  extractPrimitiveStats,
  isNextImageCompatibleSrc,
  normalizeImageSrc,
  noteAuthorIdentifier,
  noteInlineAuthorProfile,
  profileHref,
  profileLabel,
  profileSecondaryLabel,
  truncateIdentifier,
} from "@/components/explorer/utils";
import type { EventRecord, Profile } from "@/lib/types/api";

export function ArticleCard({
  article,
  author,
  href,
  rank,
  discoverySignals = false,
}: {
  article: EventRecord;
  author?: Profile;
  href?: string;
  rank?: number;
  discoverySignals?: boolean;
}) {
  const presentation = getArticlePresentation(article);
  const imageSrc = normalizeImageSrc(presentation.image);
  const resolvedAuthor = author ?? noteInlineAuthorProfile(article);
  const resolvedArticleId =
    (typeof article.id === "string" && article.id.length > 0
      ? article.id
      : typeof article.event_id === "string" && article.event_id.length > 0
        ? article.event_id
        : typeof article.eventId === "string" && article.eventId.length > 0
          ? article.eventId
          : undefined) ?? undefined;
  const articleHref =
    href ?? (resolvedArticleId ? `/notes/${encodeURIComponent(resolvedArticleId)}` : undefined);

  const authorLabel = resolvedAuthor ? profileLabel(resolvedAuthor) : noteAuthorIdentifier(article);
  const authorSecondaryLabel = resolvedAuthor
    ? profileSecondaryLabel(resolvedAuthor)
    : noteAuthorIdentifier(article);
  const authorHref = profileHref(
    resolvedAuthor,
    typeof article.pubkey === "string" ? article.pubkey : undefined
  );
  const authorAvatarProfile =
    resolvedAuthor ??
    (typeof article.pubkey === "string" && article.pubkey.length > 0
      ? { pubkey: article.pubkey }
      : null);

  const metrics = extractPrimitiveStats(article, [
    "id",
    "pubkey",
    "kind",
    "created_at",
    "content",
    "tags",
  ])
    .filter((entry) => /(reply|repost|boost|zap|like|reaction)/i.test(entry.label))
    .slice(0, 3);

  const isTopRank = typeof rank === "number" && rank <= 3;
  const rankLabel = typeof rank === "number" ? String(rank).padStart(2, "0") : null;
  const score =
    typeof article.score === "number" && Number.isFinite(article.score) ? article.score : null;

  return (
    <article
      className={`group ${cardTierClassName("standard")} ${
        isTopRank ? "border-accent-soft/40" : "border-edge/70"
      }`}
    >
      <div className="flex flex-wrap items-center gap-2 text-xs">
        {rankLabel ? (
          <span className="text-accent-ink mr-1 text-lg leading-none tracking-[-0.05em] tabular-nums">
            {rankLabel}
          </span>
        ) : null}
        <DiscoveryPill tone="neutral" className="px-2 py-0.5 text-[10px] tracking-wide uppercase">
          Long-form
        </DiscoveryPill>
        {presentation.readingMinutes ? (
          <span className="text-ink-faint">{presentation.readingMinutes} min read</span>
        ) : null}
        {presentation.language ? (
          <span className="text-ink-faint uppercase">{presentation.language}</span>
        ) : null}
      </div>

      <div className="mt-2.5 flex items-start gap-3">
        {imageSrc && isNextImageCompatibleSrc(imageSrc) ? (
          <Image
            src={imageSrc}
            alt={presentation.title}
            width={96}
            height={96}
            unoptimized
            className="border-edge-strong h-16 w-16 shrink-0 rounded-lg border object-cover sm:h-20 sm:w-20"
          />
        ) : null}
        <div className="min-w-0 flex-1">
          {articleHref ? (
            <Link href={articleHref} className="text-ink hover:text-ink-strong">
              <h3 className="text-base leading-6 font-semibold tracking-tight [overflow-wrap:anywhere] sm:text-lg">
                {presentation.title}
              </h3>
            </Link>
          ) : (
            <h3 className="text-ink text-base leading-6 font-semibold tracking-tight [overflow-wrap:anywhere] sm:text-lg">
              {presentation.title}
            </h3>
          )}
          {presentation.summary ? (
            <p className="text-ink-dim mt-1.5 line-clamp-3 text-sm leading-5 [overflow-wrap:anywhere] sm:leading-6">
              {presentation.summary}
            </p>
          ) : null}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
        {authorAvatarProfile ? (
          <ProfileAvatar
            profile={authorAvatarProfile}
            size={24}
            alt={authorLabel}
            href={authorHref}
            className="border-edge-strong h-6 w-6 rounded-full border object-cover"
          />
        ) : null}
        {authorHref ? (
          <Link href={authorHref} className="text-ink-soft hover:text-ink-strong font-medium">
            {authorLabel}
          </Link>
        ) : (
          <span className="text-ink-soft font-medium">{authorLabel}</span>
        )}
        {authorSecondaryLabel && authorHref ? (
          <Link
            href={authorHref}
            className="text-ink-faint hover:text-ink-muted"
            title={authorSecondaryLabel}
          >
            {truncateIdentifier(authorSecondaryLabel, "npub", "secondary")}
          </Link>
        ) : authorSecondaryLabel ? (
          <span className="text-ink-faint" title={authorSecondaryLabel}>
            {truncateIdentifier(authorSecondaryLabel, "npub", "secondary")}
          </span>
        ) : null}
        <span aria-hidden className="text-ink-faint/70">
          •
        </span>
        <Timestamp unixSeconds={presentation.publishedAt} />
      </div>

      {presentation.hashtags.length > 0 ? (
        <div className="text-ink-muted mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
          <span className="text-ink-faint">Topics</span>
          {presentation.hashtags.map((hashtag) => (
            <span key={hashtag} className="inline-flex items-center gap-2">
              <span aria-hidden className="text-ink-faint/70">
                •
              </span>
              <Link
                href={`/hashtags/${encodeURIComponent(hashtag)}`}
                className="text-ink-dim hover:text-ink transition"
              >
                #{hashtag}
              </Link>
            </span>
          ))}
        </div>
      ) : null}

      {discoverySignals && score !== null ? (
        <div className="text-ink-muted mt-2 text-xs">
          <span className="text-ink-faint">Score</span>{" "}
          <span className="text-ink-soft font-medium">{score.toLocaleString()}</span>
        </div>
      ) : null}

      <DiscoveryStatPills stats={metrics} className="mt-2.5 sm:mt-3" />

      {resolvedArticleId ? (
        <div className="text-ink-muted mt-2.5 flex flex-wrap items-center gap-2 text-xs sm:mt-3">
          <DiscoveryActionLinks
            actions={[
              { label: "Read article", href: articleHref },
              {
                label: "Inspect thread",
                href: `/notes/${encodeURIComponent(resolvedArticleId)}#conversation-context`,
              },
              {
                label: "Seen on relays",
                href: `/notes/${encodeURIComponent(resolvedArticleId)}#note-provenance`,
              },
            ]}
          />
        </div>
      ) : null}
    </article>
  );
}
