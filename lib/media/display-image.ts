/**
 * The Workers image binding resizes remote HTTPS files at 96px. Wider requests
 * come back blocked, so anything larger stays on the original URL.
 */
export const DISPLAY_IMAGE_WIDTH = 96;

/** Same-origin resized URL for a small slot, or the original when resizing would blur it. */
export function displayImageSrc(src: string, requestedWidth: number): string {
  if (!src.startsWith("https://") || requestedWidth > DISPLAY_IMAGE_WIDTH) return src;
  const params = new URLSearchParams({ src, w: String(DISPLAY_IMAGE_WIDTH) });
  return `/img?${params.toString()}`;
}
