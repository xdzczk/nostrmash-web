"use client";

/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useState } from "react";

import { formatUrlForDisplay } from "@/components/explorer/utils";
import { classifyEmbedUrl, parseYoutubeVideoId, youtubeEmbedSrc } from "@/lib/notes/embeds";
import { extractNoteLinkUrls } from "@/lib/notes/links";
import type { LinkPreviewResult } from "@/lib/notes/link-preview";

function YoutubeEmbed({ url }: { url: string }) {
  const videoId = parseYoutubeVideoId(url);
  if (!videoId) return null;

  return (
    <div className="border-edge/80 bg-surface-sunken/40 overflow-hidden rounded-lg border">
      <div className="relative aspect-video w-full">
        <iframe
          src={youtubeEmbedSrc(videoId)}
          title="YouTube video"
          loading="lazy"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
          className="absolute inset-0 h-full w-full border-0"
        />
      </div>
    </div>
  );
}

function TweetCard({
  preview,
  loading,
  fallbackUrl,
}: {
  preview?: LinkPreviewResult | null;
  loading?: boolean;
  fallbackUrl: string;
}) {
  const href = preview?.url ?? fallbackUrl;
  const tweet = preview?.tweet;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer nofollow"
      referrerPolicy="no-referrer"
      className="hover:border-accent/40 focus-visible:ring-accent-soft/60 block rounded-lg focus-visible:ring-2 focus-visible:outline-none"
    >
      <div className="border-edge/80 bg-surface-sunken/40 overflow-hidden rounded-lg border transition">
        <div className="px-3 py-2.5">
          <div className="flex items-center gap-2.5">
            {tweet?.avatar_url ? (
              <img
                src={tweet.avatar_url}
                alt=""
                loading="lazy"
                decoding="async"
                referrerPolicy="no-referrer"
                className="border-edge h-9 w-9 rounded-full border object-cover"
              />
            ) : (
              <div
                aria-hidden
                className="bg-surface-raised border-edge text-ink-faint flex h-9 w-9 items-center justify-center rounded-full border text-xs"
              >
                {(tweet?.author_name ?? "X").slice(0, 1).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              {loading && !tweet ? (
                <div className="space-y-1.5" aria-hidden>
                  <div className="nm-skeleton h-3.5 w-28" />
                  <div className="nm-skeleton h-3 w-20" />
                </div>
              ) : (
                <>
                  <div className="text-ink truncate text-sm font-medium">
                    {tweet?.author_name ?? preview?.title ?? "Post on X"}
                  </div>
                  {tweet?.author_handle ? (
                    <div className="text-ink-faint truncate text-xs">@{tweet.author_handle}</div>
                  ) : null}
                </>
              )}
            </div>
          </div>

          {loading && !tweet?.text ? (
            <div className="mt-3 space-y-2" aria-hidden>
              <div className="nm-skeleton h-3.5 w-full" />
              <div className="nm-skeleton h-3.5 w-4/5" />
            </div>
          ) : null}

          {tweet?.text ? (
            <p className="text-ink mt-3 line-clamp-6 text-sm leading-5 whitespace-pre-wrap">
              {tweet.text}
            </p>
          ) : preview?.description && !loading ? (
            <p className="text-ink-dim mt-3 line-clamp-4 text-sm leading-5">
              {preview.description}
            </p>
          ) : null}
        </div>

        {tweet?.media_url || preview?.image_url ? (
          <img
            src={tweet?.media_url ?? preview?.image_url}
            alt=""
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            className="max-h-56 w-full object-cover"
          />
        ) : null}

        <div className="text-ink-soft border-edge/60 border-t px-3 py-2 text-xs font-medium tracking-wide">
          x.com
        </div>
      </div>
    </a>
  );
}

function PreviewCard({
  preview,
  loading,
  fallbackUrl,
}: {
  preview?: LinkPreviewResult | null;
  loading?: boolean;
  fallbackUrl: string;
}) {
  const href = preview?.url ?? fallbackUrl;
  const domain =
    preview?.domain ??
    (() => {
      try {
        return new URL(fallbackUrl).hostname.replace(/^www\./, "");
      } catch {
        return formatUrlForDisplay(fallbackUrl, "secondary");
      }
    })();
  const title = preview?.title;
  const description = preview?.description;
  const image = preview?.image_url;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer nofollow"
      referrerPolicy="no-referrer"
      className="hover:border-accent/40 focus-visible:ring-accent-soft/60 block rounded-lg focus-visible:ring-2 focus-visible:outline-none"
    >
      <div className="border-edge/80 bg-surface-sunken/40 overflow-hidden rounded-lg border transition">
        {image ? (
          <img
            src={image}
            alt=""
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            className="max-h-40 w-full object-cover"
          />
        ) : null}
        <div className="px-3 py-2.5">
          <div className="text-ink-soft text-xs font-medium tracking-wide">{domain}</div>
          {loading && !title ? (
            <div className="mt-2 space-y-2" aria-hidden>
              <div className="nm-skeleton h-3.5 w-3/4" />
              <div className="nm-skeleton h-3 w-1/2" />
            </div>
          ) : null}
          {title ? (
            <div className="text-ink mt-0.5 line-clamp-2 text-sm font-medium">{title}</div>
          ) : null}
          {description ? (
            <p className="text-ink-dim mt-1 line-clamp-2 text-xs leading-5">{description}</p>
          ) : null}
          {!loading && !title && !description ? (
            <p className="text-ink-dim mt-0.5 text-xs">
              {formatUrlForDisplay(fallbackUrl, "secondary")}
            </p>
          ) : null}
        </div>
      </div>
    </a>
  );
}

export function NoteLinkPreviews({ content, limit = 1 }: { content: string; limit?: number }) {
  const urls = useMemo(() => extractNoteLinkUrls(content, limit), [content, limit]);
  const fetchUrls = useMemo(
    () => urls.filter((url) => classifyEmbedUrl(url) !== "youtube"),
    [urls]
  );
  const urlKey = fetchUrls.join("\n");
  const [previews, setPreviews] = useState<Record<string, LinkPreviewResult | null>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let cancelled = false;
    const targets = urlKey.length > 0 ? urlKey.split("\n") : [];
    if (targets.length === 0) return;

    setLoading(Object.fromEntries(targets.map((url) => [url, true])));

    void Promise.all(
      targets.map(async (url) => {
        try {
          const response = await fetch(`/api/link-preview?url=${encodeURIComponent(url)}`);
          if (!response.ok) {
            if (!cancelled) {
              setPreviews((current) => ({ ...current, [url]: null }));
            }
            return;
          }
          const payload = (await response.json()) as LinkPreviewResult;
          if (!cancelled) {
            setPreviews((current) => ({ ...current, [url]: payload }));
          }
        } catch {
          if (!cancelled) {
            setPreviews((current) => ({ ...current, [url]: null }));
          }
        } finally {
          if (!cancelled) {
            setLoading((current) => ({ ...current, [url]: false }));
          }
        }
      })
    );

    return () => {
      cancelled = true;
    };
  }, [urlKey]);

  if (urls.length === 0) return null;

  return (
    <div className="mt-3 space-y-3">
      {urls.map((url) => {
        const kind = classifyEmbedUrl(url);
        if (kind === "youtube") {
          return <YoutubeEmbed key={url} url={url} />;
        }
        if (kind === "twitter" || previews[url]?.provider === "twitter" || previews[url]?.tweet) {
          return (
            <TweetCard
              key={url}
              fallbackUrl={url}
              preview={previews[url]}
              loading={loading[url] ?? true}
            />
          );
        }
        return (
          <PreviewCard
            key={url}
            fallbackUrl={url}
            preview={previews[url]}
            loading={loading[url] ?? true}
          />
        );
      })}
    </div>
  );
}
