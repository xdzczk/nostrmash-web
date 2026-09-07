import Image from "next/image";
import Link from "next/link";

import { ArticleMarkdown } from "@/components/explorer/article-markdown";
import { getArticlePresentation } from "@/components/explorer/article-meta";
import { DiscoveryPill, DiscoveryStatPills } from "@/components/explorer/card-grammar";
import type { NoteContentResolution } from "@/components/explorer/note-content";
import { ProfileAvatar } from "@/components/explorer/profile-avatar";
import { Timestamp } from "@/components/explorer/timestamp";
import {
  extractEngagementStats,
  isNextImageCompatibleSrc,
  normalizeImageSrc,
  noteAuthorIdentifier,
  noteInlineAuthorProfile,
  profileHref,
  profileLabel,
  profileSecondaryLabel,
  truncateIdentifier,
  truncateProfileLabel,
} from "@/components/explorer/utils";
import type { EventRecord, Profile } from "@/lib/types/api";

export function ArticleReader({
  article,
  author,
  contentResolution,
}: {
  article: EventRecord;
  author?: Profile;
  contentResolution?: NoteContentResolution;
}) {
  const presentation = getArticlePresentation(article, { hashtagLimit: 24 });
  const imageSrc = normalizeImageSrc(presentation.image);
  const resolvedAuthor = author ?? noteInlineAuthorProfile(article);
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
  const metrics = extractEngagementStats(article);

  return (
    <article className="overflow-visible">
      <div className="flex flex-wrap items-center gap-2 text-xs">
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

      <h1 className="nm-display-lg text-ink-strong mt-4 [overflow-wrap:anywhere]">
        {presentation.title}
      </h1>

      {presentation.dek ? (
        <p className="text-ink-dim mt-3 max-w-3xl text-base leading-7 [overflow-wrap:anywhere]">
          {presentation.dek}
        </p>
      ) : null}

      <div className="mt-5 flex flex-wrap items-center gap-2 text-sm">
        {authorAvatarProfile ? (
          <ProfileAvatar
            profile={authorAvatarProfile}
            size={32}
            alt={authorLabel}
            href={authorHref}
            className="border-edge-strong h-8 w-8 rounded-full border object-cover"
          />
        ) : null}
        {authorHref ? (
          <Link
            href={authorHref}
            title={authorLabel}
            className="text-ink-soft hover:text-ink-strong inline-block max-w-[min(100%,16rem)] truncate font-medium hover:underline"
          >
            {truncateProfileLabel(authorLabel)}
          </Link>
        ) : (
          <span
            className="text-ink-soft inline-block max-w-[min(100%,16rem)] truncate font-medium"
            title={authorLabel}
          >
            {truncateProfileLabel(authorLabel)}
          </span>
        )}
        {authorSecondaryLabel ? (
          <span className="text-ink-faint" title={authorSecondaryLabel}>
            {truncateIdentifier(authorSecondaryLabel, "npub", "secondary")}
          </span>
        ) : null}
        <span aria-hidden className="text-ink-faint/70">
          •
        </span>
        <Timestamp unixSeconds={presentation.publishedAt} />
      </div>

      {imageSrc && isNextImageCompatibleSrc(imageSrc) ? (
        <Image
          src={imageSrc}
          alt={presentation.title}
          width={1200}
          height={630}
          unoptimized
          className="border-edge/80 mt-6 max-h-[28rem] w-full rounded-xl border object-cover"
        />
      ) : null}

      {presentation.hashtags.length > 0 ? (
        <div className="text-ink-muted mt-5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
          {presentation.hashtags.map((hashtag) => (
            <Link
              key={hashtag}
              href={`/hashtags/${encodeURIComponent(hashtag)}`}
              className="text-ink-dim hover:text-ink"
            >
              #{hashtag}
            </Link>
          ))}
        </div>
      ) : null}

      <div className="mt-8 max-w-3xl overflow-visible">
        <ArticleMarkdown markdown={presentation.body} resolution={contentResolution} />
      </div>

      <DiscoveryStatPills stats={metrics} className="mt-8" />
    </article>
  );
}
