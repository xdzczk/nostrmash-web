/**
 * iPhone Safari stops at the metadata of a video it has not been asked to
 * play. A start time in the fragment makes it decode the frame at that time.
 */
const FIRST_FRAME_FRAGMENT = "#t=0.001";

/** Drop a media fragment so the element does not seek into the file on its own. */
export function videoSrc(url: string): string {
  const hashIndex = url.indexOf("#");
  return hashIndex >= 0 ? url.slice(0, hashIndex) : url;
}

/** Same-origin one-frame preview of a remote video. */
export function videoFrameSrc(url: string): string {
  return `/video-frame?src=${encodeURIComponent(videoSrc(url))}${FIRST_FRAME_FRAGMENT}`;
}

/** Same-origin preview frames can be copied. A cross-origin file cannot. */
export function captureVideoStill(video: HTMLVideoElement): string | null {
  if (video.videoWidth < 1 || video.videoHeight < 1) return null;
  // Metadata alone gives a size and a blank picture.
  if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return null;
  try {
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");
    if (!context) return null;
    context.drawImage(video, 0, 0);
    return canvas.toDataURL("image/jpeg", 0.72);
  } catch {
    return null;
  }
}
