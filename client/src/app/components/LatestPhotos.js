"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import Carousel from "./Carousel";
import { groupImages } from "../../lib/photos";

export default function LatestPhotos() {
  const [group, setGroup] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/photos`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        if (Array.isArray(data) && data.length > 0) setGroup(data[0]);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // A teaser, not the full set: cap the slides so the home page opens a
  // handful of requests rather than one per photo in the newest upload.
  const images = groupImages(group).slice(0, 6);
  if (!group || !images.length) return null;

  return (
    <section className="mb-10 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/10 shadow-sm overflow-hidden">
      <Carousel
        images={images}
        alt={group.title || "Latest photos"}
        heightClass="h-[60vh]"
        autoPlay
        showThumbnails={false}
      />
      <div className="flex items-center justify-between px-6 py-4 gap-4">
        <div className="min-w-0">
          {group.title && <p className="text-sky-100 font-semibold truncate">{group.title}</p>}
          {group.caption && <p className="text-slate-400 text-sm line-clamp-1">{group.caption}</p>}
        </div>
        <div className="flex items-center gap-4 whitespace-nowrap">
          <Link href={`/photos/${group.id}`} className="text-sky-300 hover:text-sky-200 text-sm font-medium">
            Open set
          </Link>
          <Link href="/photos" className="text-sky-300 hover:text-sky-200 text-sm font-medium">
            View all photos →
          </Link>
        </div>
      </div>
    </section>
  );
}
