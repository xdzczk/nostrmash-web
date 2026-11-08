"use client";

import Link from "@/components/app-link";
import { useState, useSyncExternalStore } from "react";

const STORAGE_KEY = "nm-viewer";
const listeners = new Set<() => void>();

function validViewer(value: string): boolean {
  const trimmed = value.trim();
  return /^npub1[02-9ac-hj-np-z]+$/i.test(trimmed) || /^[0-9a-f]{64}$/i.test(trimmed);
}

function readViewer(): string {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY) ?? "";
    return validViewer(stored) ? stored.trim() : "";
  } catch {
    return "";
  }
}

function subscribe(onStoreChange: () => void): () => void {
  listeners.add(onStoreChange);
  return () => listeners.delete(onStoreChange);
}

function publish(next: string) {
  try {
    if (next) window.localStorage.setItem(STORAGE_KEY, next);
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    return false;
  }
  listeners.forEach((listener) => listener());
  return true;
}

export function YourView() {
  const pubkey = useSyncExternalStore(subscribe, readViewer, () => "");
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");

  function save(value: string) {
    const next = value.trim();
    if (!validViewer(next)) {
      setError("Paste an npub or a 64-character public key.");
      return;
    }
    if (!publish(next)) {
      setError("This browser did not keep the key.");
      return;
    }
    setDraft("");
    setError("");
  }

  async function signIn() {
    const nostr = (window as Window & { nostr?: { getPublicKey?: () => Promise<string> } }).nostr;
    if (!nostr?.getPublicKey) {
      setError("This browser has no Nostr signer. Paste a public key instead.");
      return;
    }
    try {
      save(await nostr.getPublicKey());
    } catch {
      setError("The signer did not return a key.");
    }
  }

  return (
    <div className="max-w-xl space-y-6">
      <p className="text-ink-soft text-sm leading-6">
        Your view stays in this browser. NostrMash does not create an account. A briefing limited to
        people you follow needs an API filter that is not available yet. Your public profile is
        available now.
      </p>
      {pubkey ? (
        <div className="space-y-3">
          <p className="text-ink text-sm break-all">{pubkey}</p>
          <div className="flex flex-wrap gap-4">
            <Link href={`/profiles/${encodeURIComponent(pubkey)}`} className="nm-action-link">
              Open your profile
            </Link>
            <button
              type="button"
              className="text-ink-faint hover:text-ink text-sm"
              onClick={() => publish("")}
            >
              Forget this key
            </button>
          </div>
        </div>
      ) : (
        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            save(draft);
          }}
        >
          <label className="block space-y-2">
            <span className="text-ink-muted text-xs tracking-wide uppercase">Public key</span>
            <input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="npub…"
              autoComplete="off"
              spellCheck={false}
              className="border-edge bg-surface text-ink w-full rounded-md border px-3 py-2 text-sm"
            />
          </label>
          {error ? <p className="text-danger text-sm">{error}</p> : null}
          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              className="border-edge-strong text-ink rounded-md border px-3 py-1.5 text-sm"
            >
              Save in this browser
            </button>
            <button
              type="button"
              className="text-ink-soft hover:text-ink text-sm"
              onClick={() => void signIn()}
            >
              Use browser signer
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
