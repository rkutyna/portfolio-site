"use client";
import { useState, useCallback, useEffect, useRef } from "react";
import Image from "next/image";

export default function Carousel({ images = [], alt = "", className = "", heightClass = "h-96" }) {
  const [index, setIndex] = useState(0);
  const total = images?.length || 0;
  const containerRef = useRef(null);

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

  const current = images[index];

  return (
    <div ref={containerRef} tabIndex={0} className={`outline-none ${className}`} aria-roledescription="carousel" aria-label="Image carousel">
      {/* Main image */}
      <div className={`relative w-full ${heightClass} rounded-lg overflow-hidden bg-white/5 backdrop-blur-md border border-white/10`}>
        <Image
          src={current}
          alt={alt}
          fill
          className="object-contain"
          sizes="100vw"
          unoptimized
        />
        {total > 1 && (
          <>
            <button
              type="button"
              onClick={goPrev}
              aria-label="Previous image"
              className="absolute left-3 top-1/2 -translate-y-1/2 bg-sky-300/10 hover:bg-sky-300/20 border border-sky-400/30 text-sky-100 rounded-full w-10 h-10 grid place-items-center shadow-sm focus-visible:outline-2 focus-visible:outline-sky-400/60 focus-visible:outline-offset-2"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={goNext}
              aria-label="Next image"
              className="absolute right-3 top-1/2 -translate-y-1/2 bg-sky-300/10 hover:bg-sky-300/20 border border-sky-400/30 text-sky-100 rounded-full w-10 h-10 grid place-items-center shadow-sm focus-visible:outline-2 focus-visible:outline-sky-400/60 focus-visible:outline-offset-2"
            >
              ›
            </button>
          </>
        )}
        {total > 1 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1 bg-slate-900/30 px-2 py-1 rounded-full border border-white/10 backdrop-blur">
            {images.map((_, i) => (
              <span key={i} className={`h-1.5 w-1.5 rounded-full ${i === index ? "bg-sky-300" : "bg-white/40"}`} />)
            )}
          </div>
        )}
      </div>

      {/* Thumbnails */}
      {total > 1 && (
        <div className="mt-4 flex gap-3 overflow-x-auto pb-1">
          {images.map((src, i) => (
            <button
              key={i}
              type="button"
              onClick={() => goTo(i)}
              aria-label={`Go to image ${i + 1}`}
              className={`relative h-16 w-24 shrink-0 rounded-md overflow-hidden border transition-all ${
                i === index ? "border-sky-400 ring-2 ring-sky-400/50" : "border-white/10 hover:border-sky-300/40"
              }`}
            >
              <Image src={src} alt="" fill className="object-cover" sizes="(max-width: 768px) 40vw, 200px" unoptimized />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
