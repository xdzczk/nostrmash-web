"use client";

import { useState } from "react";

function isDisplayableHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (
      (url.protocol === "http:" || url.protocol === "https:") &&
      url.hostname.length > 0 &&
      url.username.length === 0 &&
      url.password.length === 0
    );
  } catch {
    return false;
  }
}

/**
 * An ordinary img for hosts we do not proxy. A failed load removes the element
 * so a missing icon or banner does not leave a broken frame.
 */
export function PlainRemoteImage({
  src,
  alt,
  className,
  width,
  height,
  loading,
}: {
  src: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
  loading?: "eager" | "lazy";
}) {
  const [failed, setFailed] = useState(false);
  if (failed || !isDisplayableHttpUrl(src)) return null;
  return (
    // Icon and banner hosts are whatever the relay published. next/image would
    // require a remotePatterns entry for each of them.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      width={width}
      height={height}
      loading={loading}
      referrerPolicy="no-referrer"
      className={className}
      onError={() => setFailed(true)}
    />
  );
}
