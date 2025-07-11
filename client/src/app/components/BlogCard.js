import Image from 'next/image';

// This defines a new React component named BlogCard.
export default function BlogCard({ title, content, imageUrl, date}) {
  return (
    // The parent <Link> in Projects.js makes this whole card a link to the project detail page.
    <div className="border rounded-lg p-4 flex flex-col h-full hover:shadow-lg transition-shadow duration-300">
      {/* Project Image */}
      <div className="relative w-full h-48 mb-4">
        <Image
          src={imageUrl || '/images/placeholder.png'} // Use a placeholder if no image is provided
          alt={`Screenshot of ${title}`}
          layout="fill"
          objectFit="contain" // Changed from 'cover' to 'contain'
          className="rounded-t-lg"
          unoptimized // Add this prop to bypass Next.js image optimization
        />
      </div>

      {/* Project Content */}
      <div className="flex-grow">
        <h3 className="text-xl font-bold">{title}</h3>
        <p className="mt-2 text-gray-600">{content}</p>
        <p className="mt-2 text-gray-600">{new Date(date).toLocaleString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })}</p>
      </div>

      {/* External Project Link
      {blogUrl && (
        <a
          href={blogUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 text-blue-600 hover:underline self-start font-semibold"
          // Stop the click from bubbling up to the parent <Link> component
          // so it doesn't navigate to two places at once.
          onClick={(e) => e.stopPropagation()}
        >
          View Blog Post &rarr;
        </a>
      )} */}
    </div>
  );
}