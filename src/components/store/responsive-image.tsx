import type { CSSProperties } from "react";
import { buildSrcSet, pickVariant, type ResponsiveImage } from "@/domain/images";
import { cn } from "@/lib/cn";

/**
 * Plain <img srcset> over pre-generated WebP variants (ADR-0006). Stable
 * dimensions come from the container's aspect ratio; the blurred placeholder
 * is painted as a background so there is never a blank box or layout shift.
 */
export function ResponsiveImg({
  image,
  sizes,
  priority = false,
  className,
  style,
  alt,
}: {
  image: ResponsiveImage;
  sizes: string;
  /** LCP candidates: eager + high fetch priority. Everything else is lazy. */
  priority?: boolean;
  className?: string;
  style?: CSSProperties;
  alt?: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- deliberate: pre-generated variants, no optimizer
    <img
      src={pickVariant(image, 640)}
      srcSet={buildSrcSet(image)}
      sizes={sizes}
      width={image.width}
      height={image.height}
      alt={alt ?? image.alt}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : "auto"}
      decoding={priority ? "sync" : "async"}
      className={cn("block h-full w-full object-cover", className)}
      style={{
        // Blur placeholder only for eager (above-the-fold) images; lazy images
        // sit on the container's tinted background instead, keeping HTML small.
        backgroundImage: priority && image.blurDataUrl ? `url(${image.blurDataUrl})` : undefined,
        backgroundSize: "cover",
        backgroundPosition: "center",
        ...style,
      }}
    />
  );
}
