"use client";

/* eslint-disable @next/next/no-img-element */

import Image, { type ImageProps } from "next/image";
import { useState, type ComponentProps } from "react";

import { useBlossomImageSrc } from "@/hooks/use-blossom-image-src";
import { displayImageSrc } from "@/lib/media/display-image";

type BlossomImageProps = Omit<ComponentProps<"img">, "src"> & {
  src: string;
  /** CSS pixels the picture is drawn at. At 96 or below, a resized copy is tried first. */
  displayWidth?: number;
};

/**
 * Plain image that, after a failed load, retries a Blossom blob on other
 * public servers. Non-blob URLs stay as given.
 */
export function BlossomImage({
  src,
  alt = "",
  displayWidth,
  onError,
  onLoad,
  ...rest
}: BlossomImageProps) {
  const image = useBlossomImageSrc(src);
  const [direct, setDirect] = useState(false);
  const remote = image.src ?? src;
  const resized = !direct && displayWidth !== undefined && remote.startsWith("https://");
  const shown =
    resized && displayWidth !== undefined ? displayImageSrc(remote, displayWidth) : remote;

  return (
    <img
      {...rest}
      src={shown}
      alt={alt}
      onError={(event) => {
        if (resized) {
          setDirect(true);
          return;
        }
        image.onError();
        onError?.(event);
      }}
      onLoad={(event) => {
        image.onLoad();
        onLoad?.(event);
      }}
    />
  );
}

type BlossomNextImageProps = Omit<ImageProps, "src"> & {
  src: string;
};

/** next/image variant of {@link BlossomImage}. Still unoptimized by the caller. */
export function BlossomNextImage({ src, alt, onError, onLoad, ...rest }: BlossomNextImageProps) {
  const image = useBlossomImageSrc(src);

  return (
    <Image
      {...rest}
      src={image.src ?? src}
      alt={alt}
      onError={(event) => {
        image.onError();
        onError?.(event);
      }}
      onLoad={(event) => {
        image.onLoad();
        onLoad?.(event);
      }}
    />
  );
}
