"use client";
import { useState, useCallback, useEffect, useRef } from "react";
import Image from "next/image";

/**
 * Image carousel.
 *
 * Accepts either plain URL strings or `{ display, thumb, original }` records.
 * The large frame uses the 2048px display copy, the thumbnail strip uses the
 * 640px thumbnails, and only the current slide plus its immediate neighbours
 * are mounted — previously every slide loaded its full-resolution original up
 * front, which is what made photo pages take minutes to settle.
 */
const normalise = (image) =>
  typeof image === "string"
    ? { display: image, thumb: image, original: image }
    : { display: image.display || image.original, thumb: image.thumb || image.display || image.original, original: image.original };

export default function Carousel({
  images = [],
  alt = "",
  className = "",
  heightClass = "h-96",
  autoPlay = false,
  showThumbnails = true,
  onIndexChange,
}) {
  const [index, setIndex] = useState(0);
  // Slides whose large image has finished decoding. Until then the slide shows
  // its 29KB thumbnail scaled up, so advancing never lands on an empty frame.
  const [loaded, setLoaded] = useState(() => new Set());
  const slides = (images || []).map(normalise);
  const total = slides.length;
  const containerRef = useRef(null);

  const markLoaded = useCallback(
    (i) => setLoaded((prev) => (prev.has(i) ? prev : new Set(prev).add(i))),
    []
  );

  useEffect(() => {
    // Reset when the image set itself changes (e.g. navigating between photos).
    setIndex(0);
    setLoaded(new Set());
  }, [total]);

  useEffect(() => {
    onIndexChange?.(index);
  }, [index, onIndexChange]);

  useEffect(() => {
    if (!autoPlay || total <= 1) return;
    // Tick often, but only advance when the next frame has actually decoded.
    // Advancing blindly showed empty boxes whenever the network lagged behind
    // the timer, which is what made the home page look broken on first load.
    let waited = 0;
    const STEP = 500;
    const HOLD = 5000;
    const timer = setInterval(() => {
      waited += STEP;
      if (waited < HOLD) return;
      setIndex((i) => {
        const next = (i + 1) % total;
        if (!loaded.has(next)) return i; // hold on the current frame
        waited = 0;
        return next;
      });
    }, STEP);
    return () => clearInterval(timer);
  }, [autoPlay, total, loaded]);

  const goPrev = useCallback(() => {
    setIndex((i) => (total ? (i - 1 + total) % total : 0));
  }, [total]);

  const goNext = useCallback(() => {
    setIndex((i) => (total ? (i + 1) % total : 0));
  }, [total]);

  const goTo = useCallback((i) => setIndex(i), []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onKey = (e) => {
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
    };
    el.addEventListener("keydown", onKey);
    return () => el.removeEventListener("keydown", onKey);
  }, [goPrev, goNext]);

  if (!total) return null;

  // Mount the current slide and one on each side so navigation feels instant
  // without fetching the whole set.
  const isNear = (i) => {
    if (total <= 3) return true;
    const distance = Math.min(
      Math.abs(i - index),
      total - Math.abs(i - index) // wrap-around distance
    );
    // Current frame plus one either side. Autoplay waits for the next frame
    // to load rather than racing it, so a wider window only adds contention.
    return distance <= 1;
  };

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      className={`outline-none ${className}`}
      aria-roledescription="carousel"
      aria-label="Image carousel"
    >
      <div className={`relative w-full ${heightClass} rounded-lg overflow-hidden bg-white/5 backdrop-blur-md border border-white/10`}>
        {slides.map((slide, i) =>
          isNear(i) ? (
            <div
              key={slide.display}
              className={`absolute inset-0 transition-opacity duration-300 ${
                i === index ? "opacity-100" : "opacity-0 pointer-events-none"
              }`}
            >
              {/* Low-resolution stand-in, shown until the large copy is ready. */}
              {!loaded.has(i) && (
                <Image
                  src={slide.thumb}
                  alt=""
                  aria-hidden
                  fill
                  className="object-contain blur-[2px] scale-[1.02]"
                  sizes="(max-width: 1024px) 100vw, 1024px"
                  priority={i === 0}
                  unoptimized
                />
              )}
              <Image
                src={slide.display}
                alt={total > 1 ? `${alt} (${i + 1} of ${total})` : alt}
                fill
                className={`object-contain transition-opacity duration-300 ${
                  loaded.has(i) ? "opacity-100" : "opacity-0"
                }`}
                sizes="(max-width: 1024px) 100vw, 1024px"
                priority={i === 0}
                onLoad={() => markLoaded(i)}
                // A cached image can be complete before onLoad would fire, and a
                // broken one would never fire it at all — either way the large
                // layer must not stay hidden behind the placeholder.
                ref={(el) => {
                  if (el && el.complete) markLoaded(i);
                }}
                onError={() => markLoaded(i)}
                unoptimized
              />
            </div>
          ) : null
        )}
        {total > 1 && (
          <>
            <button
              type="button"
              onClick={goPrev}
              aria-label="Previous image"
              className="absolute left-3 top-1/2 -translate-y-1/2 bg-slate-900/50 hover:bg-slate-900/70 border border-sky-400/30 text-sky-100 rounded-full w-10 h-10 grid place-items-center shadow-sm backdrop-blur focus-visible:outline-2 focus-visible:outline-sky-400/60 focus-visible:outline-offset-2"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={goNext}
              aria-label="Next image"
              className="absolute right-3 top-1/2 -translate-y-1/2 bg-slate-900/50 hover:bg-slate-900/70 border border-sky-400/30 text-sky-100 rounded-full w-10 h-10 grid place-items-center shadow-sm backdrop-blur focus-visible:outline-2 focus-visible:outline-sky-400/60 focus-visible:outline-offset-2"
            >
              ›
            </button>
            <div className="absolute bottom-3 right-3 text-xs text-sky-100 bg-slate-900/50 border border-white/10 rounded-full px-2.5 py-1 backdrop-blur tabular-nums">
              {index + 1} / {total}
            </div>
          </>
        )}
      </div>

      {showThumbnails && total > 1 && (
        <div className="mt-4 flex gap-3 overflow-x-auto pb-1">
          {slides.map((slide, i) => (
            <button
              key={`${slide.thumb}-${i}`}
              type="button"
              onClick={() => goTo(i)}
              aria-label={`Go to image ${i + 1}`}
              aria-current={i === index}
              className={`relative h-16 w-24 shrink-0 rounded-md overflow-hidden border transition-all ${
                i === index ? "border-sky-400 ring-2 ring-sky-400/50" : "border-white/10 hover:border-sky-300/40"
              }`}
            >
              <Image
                src={slide.thumb}
                alt=""
                fill
                className="object-cover"
                sizes="96px"
                loading="lazy"
                unoptimized
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
