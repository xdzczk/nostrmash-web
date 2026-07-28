import type { ReactNode } from "react";

/** Embed surfaces skip the global SiteShell chrome. */
export default function EmbedLayout({ children }: { children: ReactNode }) {
  return children;
}
