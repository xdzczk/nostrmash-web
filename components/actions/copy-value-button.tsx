"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";

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

/** Small copy control for metadata fields marked copyable. */
export function CopyValueButton({ value, label = "Copy" }: { value: string; label?: string }) {
  const [status, setStatus] = useState<string | null>(null);
  if (!value) return null;

  return (
    <span className="inline-flex items-center gap-1.5">
      <Button
        size="sm"
        variant="chip"
        onClick={async () => {
          const ok = await copyText(value);
          setStatus(ok ? "Copied" : "Failed");
          window.setTimeout(() => setStatus(null), 1600);
        }}
      >
        {label}
      </Button>
      {status ? <span className="text-ink-faint text-[11px]">{status}</span> : null}
    </span>
  );
}
