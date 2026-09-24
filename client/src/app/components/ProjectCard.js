import Image from 'next/image';
import Link from 'next/link';

// This defines a new React component named ProjectCard.
//
// The whole card links to the project detail page, but it also holds the
// external "View Project" link, and an <a> may not contain another <a>: the
// browser split the server HTML apart and React threw a hydration error on
// every home page load. So the title link stretches an overlay across the
// card instead of wrapping it, and the external link sits above that overlay.
export default function ProjectCard({ href, title, description, imageUrl, projectUrl }) {
  return (
    <div className="relative bg-white/10 backdrop-blur-xl border border-white/10 rounded-xl p-4 flex flex-col h-full shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300">
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
        <h3 className="text-xl font-bold text-sky-100">
          <Link href={href} className="after:absolute after:inset-0 after:rounded-xl focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-sky-400/60">
            {title}
          </Link>
        </h3>
        <p className="mt-2 text-slate-300 line-clamp-4">{description}</p>
      </div>

      {/* External Project Link */}
      {projectUrl && (
        <a
          href={projectUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="relative z-10 mt-4 inline-flex items-center gap-1 text-sky-300 hover:text-sky-200 hover:underline self-start font-semibold"
        >
          View Project &rarr;
        </a>
      )}
    </div>
  );
}