import Link from "next/link";

import { Timestamp } from "@/components/explorer/timestamp";
import { highlightSource } from "@/lib/profile/highlight-source";
import type { EventRecord } from "@/lib/types/api";

function passage(note: EventRecord): string {
  return typeof note.content === "string" ? note.content.trim() : "";
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
            <blockquote className="text-ink text-sm leading-6 [overflow-wrap:anywhere] whitespace-pre-wrap">
              {text.length > 0 ? text : "Highlighted passage"}
            </blockquote>
            <div className="text-ink-muted mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
              {source ? (
                <p>
                  Highlighted from{" "}
                  {source.href ? (
                    <Link
                      href={source.href}
                      title={source.title}
                      className="text-link hover:text-link-hover"
                    >
                      {source.label}
                    </Link>
                  ) : (
                    <span title={source.title}>{source.label}</span>
                  )}
                </p>
              ) : (
                <p>Highlighted passage</p>
              )}
              <Timestamp unixSeconds={highlight.created_at} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
