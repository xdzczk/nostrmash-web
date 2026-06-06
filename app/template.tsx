import type { ReactNode } from "react";

// A template re-mounts on every navigation (unlike a layout), so the entrance
// animation replays each time a route's content arrives. Purely presentational.
export default function Template({ children }: { children: ReactNode }) {
  return <div className="nm-page-enter">{children}</div>;
}
