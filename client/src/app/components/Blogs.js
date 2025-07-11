import BlogCard from './BlogCard';
// 1. Import the Link component from Next.js
import Link from 'next/link';

// We update the function to accept an object with a `projects` property.
// This is called "destructuring props".
export default function Blogs({ blogs }) {
  return (
    <section id="blogs" className="p-8">
      <h2 className="text-3xl font-bold text-center mb-8">My Blog Posts</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {/* 
          We use the .map() method to loop over the `projects` array.
          For each `project` object in the array, we return a ProjectCard component.
        */}
        {blogs.map((blog) => (
          // 2. Wrap the ProjectCard in a Link component.
          // - The `key` prop must be on the outermost element in a loop.
          // - The `href` uses a template literal to create a dynamic URL
          //   like "/projects/1", "/projects/2", etc.
          <Link key={blog.id} href={`/blogs/${blog.id}`}>
            <BlogCard 
              title={blog.title} 
              content={blog.description} 
              imageUrl={blog.image_url}      // Pass the image URL
              date={blog.date}    // Pass the project link
            />
          </Link>
        ))}
      </div>
    </section>
  );
}