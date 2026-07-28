"use client";

import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

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
  const toast = useToast();
  if (!value) return null;

  return (
    <Button
      size="sm"
      variant="chip"
      onClick={async () => {
        const ok = await copyText(value);
        if (ok) toast.success("Copied");
        else toast.danger("Copy failed");
      }}
    >
      {label}
    </Button>
  );
}
