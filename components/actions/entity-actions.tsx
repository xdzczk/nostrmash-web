"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";

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
  const [status, setStatus] = useState<string | null>(null);

  const label = useMemo(() => (kind === "note" ? "note" : "profile"), [kind]);

  async function announce(message: string) {
    setStatus(message);
    window.setTimeout(() => setStatus(null), 2000);
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="secondary"
          onClick={async () => {
            const ok = await copyText(identifier);
            await announce(ok ? `Copied ${label} id` : "Copy failed");
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
                await announce("Shared");
                return;
              } catch {
                // fall through to copy
              }
            }
            const ok = await copyText(absoluteUrl);
            await announce(ok ? "Link copied" : "Share failed");
          }}
        >
          Share
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={async () => {
            const ok = await copyText(nostrUri);
            await announce(ok ? "nostr: URI copied" : "Copy failed");
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
              await announce(ok ? "Embed snippet copied" : "Copy failed");
            }}
          >
            Embed
          </Button>
        ) : null}
      </div>
      {status ? <p className="text-ink-faint text-xs">{status}</p> : null}
    </div>
  );
}
