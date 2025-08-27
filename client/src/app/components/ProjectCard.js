import Image from 'next/image';

// This defines a new React component named ProjectCard.
export default function ProjectCard({ title, description, imageUrl, projectUrl }) {
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
        <p className="mt-2 text-slate-300 line-clamp-4">{description}</p>
      </div>

      {/* External Project Link */}
      {projectUrl && (
        <a
          href={projectUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex items-center gap-1 text-sky-300 hover:text-sky-200 hover:underline self-start font-semibold"
          // Stop the click from bubbling up to the parent <Link> component
          // so it doesn't navigate to two places at once.
          onClick={(e) => e.stopPropagation()}
        >
          View Project &rarr;
        </a>
      )}
    </div>
  );
}