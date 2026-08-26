"use client";

import { useEffect, useState } from 'react';
import Photos from '../components/Photos';
import { CONTENT_DEFAULTS } from '../../lib/content';

export default function PhotosPage() {
  const [photos, setPhotos] = useState([]);
  const [content, setContent] = useState(CONTENT_DEFAULTS);
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/photos`).then((r) => r.json()),
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/content`)
        .then((r) => r.json())
        .catch(() => ({})),
    ])
      .then(([photoData, contentData]) => {
        if (cancelled) return;
        setPhotos(Array.isArray(photoData) ? photoData : []);
        setContent({ ...CONTENT_DEFAULTS, ...contentData });
        setStatus('ready');
      })
      .catch((err) => {
        if (cancelled) return;
        console.error('Error fetching photos:', err);
        setStatus('error');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (status === 'loading') {
    return (
      <div className="pt-6 py-12">
        <div className="h-10 w-64 mx-auto bg-white/10 rounded animate-pulse" />
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[0, 1, 2].map((i) => (
            <div key={i} className="bg-white/10 border border-white/10 rounded-xl p-4 animate-pulse">
              <div className="h-48 w-full bg-white/10 rounded-lg mb-4" />
              <div className="h-5 w-2/3 bg-white/10 rounded mb-3" />
              <div className="h-4 w-full bg-white/10 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return <p className="pt-12 text-center text-slate-300">The gallery could not be loaded right now.</p>;
  }

  if (!photos.length) {
    return <p className="pt-12 text-center text-slate-300">No photos have been published yet.</p>;
  }

  return (
    <div className="pt-6">
      <Photos photos={photos} heading={content.photos_heading} intro={content.photos_intro} />
    </div>
  );
}
