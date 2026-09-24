"use client";
import { useState } from "react";

/** Return a copy of `list` with the item at `from` moved to `to`. */
export function moveItem(list, from, to) {
  const next = list.slice();
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

/**
 * Reorderable thumbnail strip. Drag a thumbnail onto another to move it there,
 * or use the arrow buttons (which also work on touch screens). The first image
 * is the post's cover on the home page and the first slide of its carousel.
 *
 * `images` is a list of image sources; `onMove(from, to)` reports a move and
 * the caller reorders its own list (URLs or File objects) to match.
 */
export default function ImageOrder({ images, onMove }) {
  const [dragIndex, setDragIndex] = useState(null);
  const [overIndex, setOverIndex] = useState(null);

  if (!images.length) return null;

  const endDrag = () => {
    setDragIndex(null);
    setOverIndex(null);
  };

  const arrow =
    "h-7 w-7 rounded-md border border-white/15 bg-slate-900/70 text-slate-200 text-sm leading-none hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-slate-900/70";

  return (
    <div>
      <p className="mb-2 text-xs text-slate-400">
        Drag to reorder, or use the arrows. The first image is the cover.
      </p>
      <ol className="flex flex-wrap gap-3">
        {images.map((src, i) => (
          <li
            key={src}
            draggable
            onDragStart={(e) => {
              setDragIndex(i);
              e.dataTransfer.effectAllowed = "move";
            }}
            onDragOver={(e) => {
              e.preventDefault();
              if (overIndex !== i) setOverIndex(i);
            }}
            onDrop={(e) => {
              e.preventDefault();
              if (dragIndex !== null && dragIndex !== i) onMove(dragIndex, i);
              endDrag();
            }}
            onDragEnd={endDrag}
            className={`relative w-32 rounded-lg border bg-white/5 p-1.5 cursor-grab active:cursor-grabbing transition ${
              dragIndex === i ? "opacity-40" : ""
            } ${overIndex === i && dragIndex !== i ? "border-sky-400" : "border-white/15"}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt={`Image ${i + 1}`} className="h-20 w-full rounded object-cover pointer-events-none" />
            <span className="absolute left-2.5 top-2.5 rounded bg-slate-900/80 px-1.5 text-[11px] text-slate-200">
              {i === 0 ? "Cover" : i + 1}
            </span>
            <div className="mt-1.5 flex justify-between">
              <button
                type="button"
                className={arrow}
                disabled={i === 0}
                onClick={() => onMove(i, i - 1)}
                aria-label={`Move image ${i + 1} earlier`}
              >
                &larr;
              </button>
              <button
                type="button"
                className={arrow}
                disabled={i === images.length - 1}
                onClick={() => onMove(i, i + 1)}
                aria-label={`Move image ${i + 1} later`}
              >
                &rarr;
              </button>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
