import Image from 'next/image';

// This defines a new React component named BlogCard.
export default function BlogCard({ title, content, imageUrl, date}) {
  return (
    // The parent <Link> in Projects.js makes this whole card a link to the project detail page.
    <div className="bg-white/10 backdrop-blur-xl border border-white/10 rounded-xl p-4 flex flex-col h-full shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300">
      {/* Project Image */}
      <div className="relative w-full h-48 mb-4">
        <Image
          src={imageUrl || '/images/placeholder.svg'} // Use a placeholder if no image is provided
          alt={`Screenshot of ${title}`}
          fill
          className="object-contain rounded-t-lg"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          unoptimized // Add this prop to bypass Next.js image optimization
        />
      </div>

      {/* Project Content */}
      <div className="flex-grow">
        <h3 className="text-xl font-bold text-sky-100">{title}</h3>
        <p className="mt-2 text-slate-300">{content}</p>
        <p className="mt-3 inline-flex items-center gap-2 text-slate-400 text-sm">
          <span className="inline-block h-2 w-2 rounded-full bg-sky-400" aria-hidden></span>
          {new Date(date).toLocaleString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })}
        </p>
      </div>
    </div>
  );
}