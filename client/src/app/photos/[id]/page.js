"use client";

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import Image from 'next/image';

export default function PhotoDetailPage() {
  const params = useParams();
  const [photo, setPhoto] = useState(null);

  useEffect(() => {
    if (params.id) {
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/photos/${params.id}`)
        .then((res) => res.json())
        .then((data) => setPhoto(data))
        .catch((err) => console.error('Error fetching photo:', err));
    }
  }, [params.id]);

  if (!photo) {
    return <div>Loading...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-4 pt-6 md:p-6 lg:p-12">
      <div className="bg-white/10 backdrop-blur-xl border border-white/10 rounded-2xl p-6 sm:p-8 shadow-sm">
        {photo.title && <h1 className="text-3xl font-extrabold mb-4 text-sky-100">{photo.title}</h1>}
        <div className="relative w-full h-[60vh] mb-6">
          <Image
            src={photo.image_url || '/images/placeholder.svg'}
            alt={photo.title || 'Photo'}
            fill
            className="object-contain rounded-lg"
            sizes="100vw"
            unoptimized
          />
        </div>
        {photo.caption && (
          <div className="text-lg text-slate-300 mb-6 whitespace-pre-wrap">
            {photo.caption}
          </div>
        )}
        <div className="flex items-center justify-between text-sm text-slate-400">
          {photo.created_at && (
            <p>{new Date(photo.created_at).toLocaleString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })}</p>
          )}
          {photo.raw_url && (
            <a href={photo.raw_url} target="_blank" rel="noopener noreferrer" className="text-sky-300 hover:text-sky-200 underline">
              Download original file
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
