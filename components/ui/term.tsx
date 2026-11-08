import Link from "@/components/app-link";
import type { ReactNode } from "react";

import { GLOSSARY, type GlossaryId } from "@/lib/i18n/glossary";

/** Dotted term with a one-line gloss and a link to the methodology entry. */
export function Term({ id, children }: { id: GlossaryId; children: ReactNode }) {
  const entry = GLOSSARY[id];
  return (
    <Link
      href={entry.href}
      title={entry.gloss}
      className="decoration-ink-faint underline decoration-dotted underline-offset-[3px]"
    >
      {children}
      <span className="sr-only"> ({entry.gloss})</span>
    </Link>
  );
}
