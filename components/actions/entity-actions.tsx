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
  compact = false,
  layout = "row",
}: {
  kind: ActionKind;
  absoluteUrl: string;
  /** npub or nevent/note bech32 for copy */
  identifier: string;
  nostrUri: string;
  embedHtml?: string;
  njumpUrl?: string;
  /** Short row for the focal note: share, copy, open, embed. */
  compact?: boolean;
  /** `menu` collapses every action behind one Open control. Notes keep `row`. */
  layout?: "row" | "menu";
}) {
  const toast = useToast();
  const label = useMemo(() => (kind === "note" ? "note" : "profile"), [kind]);
  const copyLabel = kind === "note" ? "nevent" : "npub";
  const menuItemClass =
    "text-ink-soft hover:bg-surface-hover hover:text-ink flex min-h-9 w-full items-center rounded-md px-3 text-left text-sm";

  if (layout === "menu") {
    return (
      <details className="relative" data-testid="entity-actions-menu">
        <summary className="nm-pressable border-edge-strong bg-surface/60 text-ink-soft hover:bg-surface/80 inline-flex min-h-9 cursor-pointer list-none items-center justify-center rounded-lg border px-3 py-1.5 text-xs font-medium">
          Open
        </summary>
        <div className="border-edge bg-surface absolute right-0 z-30 mt-2 flex w-52 flex-col rounded-lg border p-1">
          <a href={nostrUri} className={menuItemClass}>
            Open in client
          </a>
          {njumpUrl ? (
            <a href={njumpUrl} target="_blank" rel="noopener noreferrer" className={menuItemClass}>
              njump
            </a>
          ) : null}
          <a
            href={`https://damus.io/${encodeURIComponent(identifier)}`}
            target="_blank"
            rel="noopener noreferrer"
            className={menuItemClass}
          >
            Damus
          </a>
          <a
            href={`https://amethyst.social/${encodeURIComponent(identifier)}`}
            target="_blank"
            rel="noopener noreferrer"
            className={menuItemClass}
          >
            Amethyst
          </a>
          <button
            type="button"
            className={menuItemClass}
            onClick={async () => {
              const ok = await copyText(identifier);
              if (ok) toast.success(`Copied ${label} id`);
              else toast.danger("Copy failed");
            }}
          >
            Copy {copyLabel}
          </button>
          <button
            type="button"
            className={menuItemClass}
            onClick={async () => {
              const ok = await copyText(nostrUri);
              if (ok) toast.success("nostr: URI copied");
              else toast.danger("Copy failed");
            }}
          >
            Copy nostr
          </button>
          <button
            type="button"
            className={menuItemClass}
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
          </button>
          {embedHtml ? (
            <button
              type="button"
              className={menuItemClass}
              onClick={async () => {
                const ok = await copyText(embedHtml);
                if (ok) toast.success("Embed snippet copied");
                else toast.danger("Copy failed");
              }}
            >
              Embed
            </button>
          ) : null}
        </div>
      </details>
    );
  }

  if (compact) {
    return (
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          variant="chip"
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
          variant="chip"
          onClick={async () => {
            const ok = await copyText(identifier);
            if (ok) toast.success(`Copied ${label} id`);
            else toast.danger("Copy failed");
          }}
        >
          Copy {kind === "note" ? "nevent" : "npub"}
        </Button>
        <a
          href={nostrUri}
          className="border-edge-strong text-ink-soft hover:text-ink inline-flex min-h-9 items-center rounded-full border px-3 text-xs font-medium"
        >
          Open in client
        </a>
        {embedHtml ? (
          <details className="text-ink-dim text-xs">
            <summary className="border-edge-strong text-ink-soft hover:text-ink inline-flex min-h-9 cursor-pointer list-none items-center rounded-full border px-3 text-xs font-medium">
              Embed
            </summary>
            <pre className="border-edge/70 bg-surface-sunken/40 mt-2 max-w-full overflow-x-auto rounded-lg border p-3 whitespace-pre-wrap">
              {embedHtml}
            </pre>
          </details>
        ) : null}
      </div>
    );
  }

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
