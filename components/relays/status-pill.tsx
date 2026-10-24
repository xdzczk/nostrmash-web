import type { ReactNode } from "react";

const TONES = {
  ok: "border-success/50 text-success-ink",
  bad: "border-danger/50 text-danger-ink",
  warn: "border-warning/50 text-warning-ink",
  neutral: "border-edge-strong text-ink-muted",
} as const;

export function StatusPill({ tone, children }: { tone: keyof typeof TONES; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] ${TONES[tone]}`}
    >
      {children}
    </span>
  );
}
