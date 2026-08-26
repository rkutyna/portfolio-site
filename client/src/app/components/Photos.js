import Link from 'next/link';
import PhotoCard from './PhotoCard';
import { groupImages } from '../../lib/photos';

export default function Photos({ photos, heading = 'Photo Gallery', intro = '' }) {
  return (
    <section id="photos" className="py-12 scroll-mt-24">
      <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-center text-sky-100">
        {heading}
      </h2>
      <div className="mt-3 h-1 w-20 bg-sky-400/70 rounded mx-auto" />
      {intro ? (
        <p className="mt-6 max-w-2xl mx-auto text-center text-slate-300 whitespace-pre-wrap">{intro}</p>
      ) : null}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {photos.map((photo, i) => (
          <Link key={photo.id} href={`/photos/${photo.id}`} className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 rounded-xl">
            <PhotoCard
              title={photo.title}
              caption={photo.caption}
              images={groupImages(photo)}
              createdAt={photo.created_at}
              priority={i < 3}
            />
          </Link>
        ))}
      </div>
    </section>
  );
}
