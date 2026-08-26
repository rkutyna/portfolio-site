"use client";
import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { formatDateTime } from '../../lib/dates';

/**
 * A gallery card for one upload group.
 *
 * Only thumbnails are ever requested here, and only the frames that have
 * actually been shown are mounted — cycling through a group of twenty photos
 * used to pull twenty full-resolution originals in the background.
 */
export default function PhotoCard({ title, caption, images = [], createdAt, priority = false }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  // Frames the user has reached. Anything outside this set is never rendered,
  // so it never hits the network.
  const [seen, setSeen] = useState(() => new Set([0]));
  const total = images.length;
  const cardRef = useRef(null);
  const [visible, setVisible] = useState(false);

  // Only animate while the card is actually on screen.
  useEffect(() => {
    const el = cardRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { rootMargin: '200px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (total <= 1 || !visible || paused) return;
    const timer = setInterval(() => {
      setIndex((i) => {
        const next = (i + 1) % total;
        setSeen((prev) => (prev.has(next) ? prev : new Set(prev).add(next)));
        return next;
      });
    }, 3500);
    return () => clearInterval(timer);
  }, [total, visible, paused]);

  return (
    <div
      ref={cardRef}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      className="bg-white/10 backdrop-blur-xl border border-white/10 rounded-xl p-4 flex flex-col h-full shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300"
    >
      <div className="relative w-full h-48 mb-4 rounded-lg overflow-hidden bg-white/5">
        {total === 0 ? (
          <Image
            src="/images/placeholder.svg"
            alt="No photo"
            fill
            className="object-contain"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            unoptimized
          />
        ) : (
          images.map((image, i) =>
            seen.has(i) ? (
              <Image
                key={image.thumb}
                src={image.thumb}
                alt={title ? `${title} — photo ${i + 1} of ${total}` : `Photo ${i + 1} of ${total}`}
                fill
                className={`object-contain transition-opacity duration-500 ${
                  i === index ? 'opacity-100' : 'opacity-0'
                }`}
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                priority={priority && i === 0}
                loading={priority && i === 0 ? undefined : 'lazy'}
                unoptimized
              />
            ) : null
          )
        )}
        {total > 1 && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1 bg-slate-900/40 px-2 py-1 rounded-full border border-white/10 backdrop-blur">
            {images.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 w-1.5 rounded-full transition-colors ${
                  i === index ? 'bg-sky-300' : 'bg-white/40'
                }`}
              />
            ))}
          </div>
        )}
        {total > 1 && (
          <span className="absolute top-2 right-2 text-[11px] font-medium text-sky-100 bg-slate-900/50 border border-white/10 rounded-full px-2 py-0.5 backdrop-blur">
            {total} photos
          </span>
        )}
      </div>
      <div className="flex-grow">
        {title ? <h3 className="text-xl font-bold text-sky-100">{title}</h3> : null}
        {caption ? <p className="mt-2 text-slate-300 line-clamp-3">{caption}</p> : null}
        {createdAt ? (
          <p className="mt-3 inline-flex items-center gap-2 text-slate-400 text-sm">
            <span className="inline-block h-2 w-2 rounded-full bg-sky-400" aria-hidden />
            {formatDateTime(createdAt)}
          </p>
        ) : null}
      </div>
    </div>
  );
}
