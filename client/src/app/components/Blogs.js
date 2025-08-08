import BlogCard from './BlogCard';
// Import the Link component from Next.js
import Link from 'next/link';

// Accepts an object with a `blogs` property (destructuring props).
export default function Blogs({ blogs }) {
  return (
    <section id="blogs" className="py-12 scroll-mt-24">
      <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-center text-sky-100">
        My Blog Posts
      </h2>
      <div className="mt-3 h-1 w-20 bg-sky-400/70 rounded mx-auto" />
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {/* Map over `blogs` and render a BlogCard for each */}
        {blogs.map((blog) => (
          // Wrap each BlogCard in a Link to its detail page.
          <Link key={blog.id} href={`/blogs/${blog.id}`}>
            <BlogCard 
              title={blog.title} 
              content={blog.content} 
              imageUrl={(blog.images && blog.images.length ? blog.images[0] : blog.image_url)}
              date={blog.date}
            />
          </Link>
        ))}
      </div>
    </section>
  );
}