"use client";

import { useEffect } from "react";

/** Tab title for a headline that arrives after the shell. */
export function DocumentTitle({ title }: { title: string }) {
  useEffect(() => {
    document.title = title;
  }, [title]);
  return null;
}
