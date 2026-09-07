import type { ReactNode } from "react";
import Markdown from "react-markdown";

import { RichInlineText, type NoteContentResolution } from "@/components/explorer/note-content";
import { isNextImageCompatibleSrc, normalizeImageSrc } from "@/components/explorer/utils";
import { EnlargeableImage } from "@/components/ui/image-lightbox";
import { markdownHref } from "@/lib/notes/markdown-href";

function linkifyInline(children: ReactNode, resolution?: NoteContentResolution): ReactNode {
  if (typeof children === "string") {
    return (
      <RichInlineText
        text={children}
        as="span"
        className="leading-inherit [display:inline] text-[length:inherit] text-inherit"
        resolution={resolution}
      />
    );
  }
  if (Array.isArray(children)) {
    return children.map((child, index) => (
      <span key={index}>{linkifyInline(child, resolution)}</span>
    ));
  }
  return children;
}

export function ArticleMarkdown({
  markdown,
  resolution,
}: {
  markdown: string;
  resolution?: NoteContentResolution;
}) {
  if (!markdown.trim()) {
    return <p className="text-ink-muted">(no content)</p>;
  }

  return (
    <Markdown
      urlTransform={(url) => markdownHref(url) ?? ""}
      components={{
        h1: ({ children }) => (
          <h2 className="nm-title text-ink-strong mt-10 mb-3 [overflow-wrap:anywhere] first:mt-0">
            {children}
          </h2>
        ),
        h2: ({ children }) => (
          <h3 className="text-ink-strong mt-8 mb-2 text-xl font-semibold tracking-tight [overflow-wrap:anywhere]">
            {children}
          </h3>
        ),
        h3: ({ children }) => (
          <h4 className="text-ink mt-6 mb-2 text-lg font-semibold tracking-tight [overflow-wrap:anywhere]">
            {children}
          </h4>
        ),
        p: ({ children }) => (
          <p className="text-ink nm-body mt-4 [overflow-wrap:anywhere] first:mt-0">
            {linkifyInline(children, resolution)}
          </p>
        ),
        a: ({ href, children }) => {
          const safeHref = markdownHref(href);
          if (!safeHref) return <span>{children}</span>;
          const external = safeHref.startsWith("http://") || safeHref.startsWith("https://");
          return (
            <a
              href={safeHref}
              title={external ? safeHref : undefined}
              target={external ? "_blank" : undefined}
              rel={external ? "noopener noreferrer nofollow" : undefined}
              className="text-link hover:text-link-hover underline-offset-2 hover:underline"
            >
              {children}
            </a>
          );
        },
        ul: ({ children }) => (
          <ul className="text-ink nm-body mt-4 list-disc space-y-2 pl-6">{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className="text-ink nm-body mt-4 list-decimal space-y-2 pl-6">{children}</ol>
        ),
        li: ({ children }) => (
          <li className="[overflow-wrap:anywhere]">{linkifyInline(children, resolution)}</li>
        ),
        blockquote: ({ children }) => (
          <blockquote className="border-edge text-ink-dim mt-4 border-l-2 pl-4">
            {children}
          </blockquote>
        ),
        hr: () => <hr className="border-edge/70 my-8" />,
        img: ({ src, alt }) => {
          const imageSrc = typeof src === "string" ? normalizeImageSrc(src) : null;
          if (!imageSrc || !isNextImageCompatibleSrc(imageSrc)) return null;
          const imageAlt = typeof alt === "string" ? alt : "";
          return (
            <EnlargeableImage
              src={imageSrc}
              alt={imageAlt}
              className="my-6 block w-full cursor-zoom-in"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageSrc}
                alt={imageAlt}
                loading="lazy"
                decoding="async"
                referrerPolicy="no-referrer"
                className="border-edge/80 max-h-[36rem] w-full rounded-lg border object-cover"
              />
            </EnlargeableImage>
          );
        },
        pre: ({ children }) => (
          <pre className="border-edge/80 bg-surface-sunken text-ink-soft mt-4 overflow-x-auto rounded-lg border p-4 text-sm leading-6 [overflow-wrap:anywhere] whitespace-pre-wrap">
            {children}
          </pre>
        ),
        code: ({ children }) => (
          <code className="bg-surface-sunken text-ink-soft rounded px-1 py-0.5 font-mono text-[0.9em]">
            {children}
          </code>
        ),
        strong: ({ children }) => (
          <strong className="text-ink-strong font-semibold">{children}</strong>
        ),
        em: ({ children }) => <em className="italic">{children}</em>,
      }}
    >
      {markdown}
    </Markdown>
  );
}
