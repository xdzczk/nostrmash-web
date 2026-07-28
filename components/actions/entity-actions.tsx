"use client";

import { useMemo } from "react";

import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

type ActionKind = "note" | "profile";

async function copyText(value: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    try {
      const input = document.createElement("textarea");
      input.value = value;
      input.setAttribute("readonly", "");
      input.style.position = "absolute";
      input.style.left = "-9999px";
      document.body.appendChild(input);
      input.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(input);
      return ok;
    } catch {
      return false;
    }
  }
}

export function EntityActions({
  kind,
  absoluteUrl,
  identifier,
  nostrUri,
  embedHtml,
  njumpUrl,
}: {
  kind: ActionKind;
  absoluteUrl: string;
  /** npub or nevent/note bech32 for copy */
  identifier: string;
  nostrUri: string;
  embedHtml?: string;
  njumpUrl?: string;
}) {
  const toast = useToast();
  const label = useMemo(() => (kind === "note" ? "note" : "profile"), [kind]);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="secondary"
          onClick={async () => {
            const ok = await copyText(identifier);
            if (ok) toast.success(`Copied ${label} id`);
            else toast.danger("Copy failed");
          }}
        >
          Copy {kind === "note" ? "nevent" : "npub"}
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={async () => {
            if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
              try {
                await navigator.share({ url: absoluteUrl, title: `NostrMash ${label}` });
                toast.success("Shared");
                return;
              } catch {
                // fall through to copy
              }
            }
            const ok = await copyText(absoluteUrl);
            if (ok) toast.success("Link copied");
            else toast.danger("Share failed");
          }}
        >
          Share
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={async () => {
            const ok = await copyText(nostrUri);
            if (ok) toast.success("nostr: URI copied");
            else toast.danger("Copy failed");
          }}
        >
          Copy nostr:
        </Button>
        <a
          href={nostrUri}
          className="nm-pressable border-edge-strong bg-surface/60 text-ink-soft hover:bg-surface/80 inline-flex min-h-9 items-center justify-center rounded-lg border px-3 py-1.5 text-xs font-medium"
        >
          Open in client
        </a>
        {njumpUrl ? (
          <a
            href={njumpUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="nm-pressable border-edge-strong bg-surface/60 text-ink-soft hover:bg-surface/80 inline-flex min-h-9 items-center justify-center rounded-lg border px-3 py-1.5 text-xs font-medium"
          >
            Open in njump
          </a>
        ) : null}
        <a
          href={`https://damus.io/${encodeURIComponent(identifier)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="nm-pressable border-edge-strong bg-surface/60 text-ink-soft hover:bg-surface/80 inline-flex min-h-9 items-center justify-center rounded-lg border px-3 py-1.5 text-xs font-medium"
        >
          Damus
        </a>
        <a
          href={`https://amethyst.social/${encodeURIComponent(identifier)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="nm-pressable border-edge-strong bg-surface/60 text-ink-soft hover:bg-surface/80 inline-flex min-h-9 items-center justify-center rounded-lg border px-3 py-1.5 text-xs font-medium"
        >
          Amethyst
        </a>
        {embedHtml ? (
          <Button
            size="sm"
            variant="chip"
            onClick={async () => {
              const ok = await copyText(embedHtml);
              if (ok) toast.success("Embed snippet copied");
              else toast.danger("Copy failed");
            }}
          >
            Embed
          </Button>
        ) : null}
      </div>
    </div>
  );
}
