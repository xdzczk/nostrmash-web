import Link from "next/link";

import { Timestamp } from "@/components/explorer/timestamp";
import { highlightSource, type HighlightSource } from "@/lib/profile/highlight-source";
import type { EventRecord } from "@/lib/types/api";

function passage(note: EventRecord): string {
  return typeof note.content === "string" ? note.content.trim() : "";
}

function SourceLink({ source }: { source: HighlightSource }) {
  const className = "text-link hover:text-link-hover";
  if (!source.href) return <span title={source.title}>{source.label}</span>;
  if (source.external) {
    return (
      <a
        href={source.href}
        title={source.title}
        target="_blank"
        rel="noopener noreferrer nofollow"
        className={className}
      >
        {source.label}
      </a>
    );
  }
  return (
    <Link href={source.href} title={source.title} className={className}>
      {source.label}
    </Link>
  );
}

export function ProfileHighlightsList({ highlights }: { highlights: EventRecord[] }) {
  return (
    <ul className="min-w-0 space-y-3">
      {highlights.map((highlight, index) => {
        const source = highlightSource(highlight);
        const text = passage(highlight);
        const key = highlight.id ?? `highlight-${index}`;
        return (
          <li key={key} className="border-edge/70 border-b px-1 py-4">
            <blockquote
              title={text.length > 0 ? text : undefined}
              className="text-ink line-clamp-6 text-sm leading-6 [overflow-wrap:anywhere] whitespace-pre-line"
            >
              {text.length > 0 ? text : "Highlighted passage"}
            </blockquote>
            <div className="text-ink-muted mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
              {source ? (
                <p>
                  Highlighted from <SourceLink source={source} />
                </p>
              ) : null}
              <Timestamp unixSeconds={highlight.created_at} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
