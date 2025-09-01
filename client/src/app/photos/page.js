"use client";

import { useEffect, useState } from 'react';
import Photos from '../components/Photos';

export default function PhotosPage() {
  const [photos, setPhotos] = useState([]);
  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/photos`)
      .then((res) => res.json())
      .then((data) => setPhotos(data))
      .catch((err) => console.error('Error fetching photos:', err));
  }, []);

  return (
    <div className="pt-6">
      <Photos photos={photos} />
    </div>
  );
}
