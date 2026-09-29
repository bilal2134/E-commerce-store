"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ResponsiveImage } from "@/domain/images";
import { cn } from "@/lib/cn";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/ui/icons";
import { ResponsiveImg } from "../responsive-image";

/**
 * Product gallery (CS-05). Mobile: native scroll-snap carousel (touch swipe
 * with no JS), with counter, dots and arrow-key support. Desktop (lg+): all
 * photos stacked in a two-column grid so nothing is hidden behind a control.
 * Stable 4:5 frames prevent layout shift; only the first image is eager.
 */
export function ProductGallery({ images, productName }: { images: ResponsiveImage[]; productName: string }) {
  const trackRef = useRef<HTMLUListElement>(null);
  const [index, setIndex] = useState(0);
  const count = images.length;

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const slides = Array.from(track.children) as HTMLElement[];
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting && e.intersectionRatio >= 0.6) {
            setIndex(slides.indexOf(e.target as HTMLElement));
          }
        }
      },
      { root: track, threshold: [0.6] },
    );
    slides.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, [count]);

  const goTo = useCallback((i: number) => {
    const track = trackRef.current;
    const slide = track?.children[i] as HTMLElement | undefined;
    if (!track || !slide) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    track.scrollTo({ left: slide.offsetLeft - track.offsetLeft, behavior: reduce ? "auto" : "smooth" });
  }, []);

  if (count === 0) {
    return <div className="aspect-[4/5] bg-blush" aria-hidden="true" />;
  }

  return (
    <section aria-roledescription="carousel" aria-label={`${productName} photos`} className="relative">
      <ul
        ref={trackRef}
        tabIndex={0}
        aria-label={`Photos, ${count} total. Use left and right arrow keys to browse.`}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") {
            e.preventDefault();
            goTo(Math.min(count - 1, index + 1));
          } else if (e.key === "ArrowLeft") {
            e.preventDefault();
            goTo(Math.max(0, index - 1));
          }
        }}
        className={cn(
          "scroller flex snap-x snap-mandatory overflow-x-auto",
          "lg:grid lg:snap-none lg:grid-cols-2 lg:gap-2 lg:overflow-visible",
        )}
      >
        {images.map((img, i) => (
          <li
            key={img.baseUrl}
            aria-roledescription="slide"
            aria-label={`${i + 1} of ${count}`}
            className={cn(
              "w-full shrink-0 snap-center lg:w-auto",
              i === 0 && count % 2 === 1 && "lg:col-span-2",
            )}
          >
            <div className="relative aspect-[4/5] overflow-hidden bg-blush">
              <ResponsiveImg
                image={img}
                priority={i === 0}
                sizes={
                  i === 0 && count % 2 === 1
                    ? "(min-width: 64rem) 55vw, 100vw"
                    : "(min-width: 64rem) 28vw, 100vw"
                }
              />
            </div>
          </li>
        ))}
      </ul>

      {count > 1 ? (
        <div className="lg:hidden">
          <p
            className="pointer-events-none absolute end-3 top-3 rounded-xs bg-surface/90 px-2 py-0.5 text-xs font-medium text-ink"
            aria-live="polite"
          >
            {index + 1} / {count}
          </p>
          <button
            type="button"
            onClick={() => goTo(Math.max(0, index - 1))}
            disabled={index === 0}
            className="absolute start-2 top-1/2 inline-flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-surface/90 text-ink shadow-overlay disabled:opacity-0"
            aria-label="Previous photo"
          >
            <ChevronLeftIcon />
          </button>
          <button
            type="button"
            onClick={() => goTo(Math.min(count - 1, index + 1))}
            disabled={index === count - 1}
            className="absolute end-2 top-1/2 inline-flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-surface/90 text-ink shadow-overlay disabled:opacity-0"
            aria-label="Next photo"
          >
            <ChevronRightIcon />
          </button>
          <div className="mt-3 flex justify-center gap-1.5">
            {images.map((img, i) => (
              <button
                key={img.baseUrl}
                type="button"
                onClick={() => goTo(i)}
                aria-label={`Show photo ${i + 1}`}
                aria-current={i === index ? "true" : undefined}
                className="group inline-flex size-6 items-center justify-center"
              >
                <span
                  className={cn(
                    "block h-1.5 rounded-full transition-all",
                    i === index ? "w-5 bg-ink" : "w-1.5 bg-line-strong group-hover:bg-ink-soft",
                  )}
                />
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
