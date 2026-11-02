"use client";

/* eslint-disable @next/next/no-img-element */

import Image, { type ImageProps } from "next/image";
import type { ComponentProps } from "react";

import { useBlossomImageSrc } from "@/hooks/use-blossom-image-src";

type BlossomImageProps = Omit<ComponentProps<"img">, "src"> & {
  src: string;
};

/**
 * Plain image that, after a failed load, retries a Blossom blob on other
 * public servers. Non-blob URLs stay as given.
 */
export function BlossomImage({ src, alt = "", onError, onLoad, ...rest }: BlossomImageProps) {
  const image = useBlossomImageSrc(src);

  return (
    <img
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
