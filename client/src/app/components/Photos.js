import Link from 'next/link';
import PhotoCard from './PhotoCard';

export default function Photos({ photos }) {
  return (
    <section id="photos" className="py-12 scroll-mt-24">
      <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-center text-sky-100">
        Photo Gallery
      </h2>
      <div className="mt-3 h-1 w-20 bg-sky-400/70 rounded mx-auto" />
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {photos.map((photo) => (
          <Link key={photo.id} href={`/photos/${photo.id}`}>
            <PhotoCard
              title={photo.title}
              caption={photo.caption}
              imageUrl={photo.image_url}
              createdAt={photo.created_at}
            />
          </Link>
        ))}
      </div>
    </section>
  );
}
