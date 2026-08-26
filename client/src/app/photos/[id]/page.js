"use client";

import { useParams } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import Carousel from '../../components/Carousel';
import { rowImages, formatBytes, downloadName } from '../../../lib/photos';
import { formatDateTime } from '../../../lib/dates';

export default function PhotoDetailPage() {
  const params = useParams();
  const [photo, setPhoto] = useState(null);
  const [images, setImages] = useState([]);
  const [current, setCurrent] = useState(0);
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    if (!params.id) return;
    let cancelled = false;
    setStatus('loading');
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/photos/${params.id}`)
      .then((res) => {
        if (!res.ok) throw new Error(`Photo request failed (${res.status})`);
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;
        const row = data && data.photo ? data.photo : data;
        const group = Array.isArray(data?.group) && data.group.length ? data.group : [row];
        setPhoto(row);
        setImages(rowImages(group));
        setStatus('ready');
      })
      .catch((err) => {
        if (cancelled) return;
        console.error('Error fetching photo:', err);
        setStatus('error');
      });
    return () => {
      cancelled = true;
    };
  }, [params.id]);

  const handleIndexChange = useCallback((i) => setCurrent(i), []);

  if (status === 'loading') {
    return (
      <div className="max-w-4xl mx-auto p-4 pt-6 md:p-6 lg:p-12">
        <div className="bg-white/10 border border-white/10 rounded-2xl p-6 sm:p-8 animate-pulse">
          <div className="h-8 w-2/3 bg-white/10 rounded mb-6" />
          <div className="h-[50vh] w-full bg-white/10 rounded-lg mb-6" />
          <div className="h-4 w-full bg-white/10 rounded mb-2" />
          <div className="h-4 w-4/5 bg-white/10 rounded" />
        </div>
      </div>
    );
  }

  if (status === 'error' || !photo) {
    return (
      <div className="max-w-4xl mx-auto p-4 pt-6 md:p-6 lg:p-12 text-center">
        <p className="text-slate-300 mb-4">That photo could not be loaded.</p>
        <Link href="/photos" className="text-sky-300 hover:text-sky-200 underline">
          Back to the gallery
        </Link>
      </div>
    );
  }

  const active = images[current];
  const activeSize = formatBytes(active?.bytes);

  return (
    <div className="max-w-4xl mx-auto p-4 pt-6 md:p-6 lg:p-12">
      <div className="bg-white/10 backdrop-blur-xl border border-white/10 rounded-2xl p-6 sm:p-8 shadow-sm">
        <Link href="/photos" className="text-slate-400 hover:text-sky-300 text-sm">
          ← All photos
        </Link>
        {photo.title && (
          <h1 className="text-3xl font-extrabold mt-3 mb-4 text-sky-100">{photo.title}</h1>
        )}
        {images.length > 0 ? (
          <div className="mb-6">
            <Carousel
              images={images}
              alt={photo.title || 'Photo'}
              heightClass="h-[60vh]"
              onIndexChange={handleIndexChange}
            />
          </div>
        ) : (
          <div className="relative w-full h-[60vh] mb-6 rounded-lg bg-white/5 border border-white/10 grid place-items-center text-slate-400">
            This photo is still being processed.
          </div>
        )}
        {photo.caption && (
          <div className="text-lg text-slate-300 mb-6 whitespace-pre-wrap">{photo.caption}</div>
        )}
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-400 border-t border-white/10 pt-4">
          <div className="flex flex-col gap-1">
            {photo.created_at && (
              <p>
                {formatDateTime(photo.created_at)}
              </p>
            )}
            {active?.width && active?.height && (
              <p className="text-slate-500 tabular-nums">
                {active.width} × {active.height}
              </p>
            )}
          </div>
          {active?.original && (
            <a
              href={active.original}
              download={downloadName(active.original, photo.title)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-sky-400/30 bg-sky-500/10 px-3 py-2 text-sky-200 hover:bg-sky-500/20 hover:text-sky-100 transition-colors"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Download full resolution
              {activeSize && <span className="text-sky-300/70">({activeSize})</span>}
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
