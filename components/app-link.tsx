import NextLink from "next/link";
import type { ComponentProps } from "react";

/**
 * Viewport prefetch of note, profile, hashtag, and domain links fires a burst
 * of GETs. Those paths are rate limited, so prefetch stays off unless a caller
 * opts in.
 */
export default function Link({ prefetch = false, ...props }: ComponentProps<typeof NextLink>) {
  return <NextLink prefetch={prefetch} {...props} />;
}
