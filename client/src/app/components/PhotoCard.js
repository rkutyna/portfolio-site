import Image from 'next/image';

export default function PhotoCard({ title, caption, imageUrl, createdAt }) {
  return (
    <div className="bg-white/10 backdrop-blur-xl border border-white/10 rounded-xl p-4 flex flex-col h-full shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300">
      <div className="relative w-full h-48 mb-4">
        <Image
          src={imageUrl || '/images/placeholder.svg'}
          alt={title ? `Photo: ${title}` : 'Photo'}
          fill
          className="object-contain rounded-t-lg"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          unoptimized
        />
      </div>
      <div className="flex-grow">
        {title ? <h3 className="text-xl font-bold text-sky-100">{title}</h3> : null}
        {caption ? <p className="mt-2 text-slate-300 line-clamp-3">{caption}</p> : null}
        {createdAt ? (
          <p className="mt-3 inline-flex items-center gap-2 text-slate-400 text-sm">
            <span className="inline-block h-2 w-2 rounded-full bg-sky-400" aria-hidden />
            {new Date(createdAt).toLocaleString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })}
          </p>
        ) : null}
      </div>
    </div>
  );
}
