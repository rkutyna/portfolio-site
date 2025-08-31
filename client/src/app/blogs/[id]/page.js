"use client";

// We import the hooks we need: `useParams` to read the URL, and our old friends `useState` and `useEffect`.
import { useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import Image from 'next/image'; // Import the Next.js Image component
import Carousel from '../../components/Carousel';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';

export default function BlogPage() {
  // The `useParams` hook returns an object containing the route's dynamic parameters.
  // In our case, it will be an object like { id: '1' }.
  const params = useParams();

  // We set up state to hold our project's data.
  const [blog, setBlog] = useState(null);

  // We use useEffect to fetch the data for this specific project.
  useEffect(() => {
    // We only run the fetch if the `id` is available.
    if (params.id) {
      // Fetch data for the specific project
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/blogs/${params.id}`)
        .then((res) => res.json())
        .then((data) => {
          setBlog(data);
        })
        .catch((error) => {
          console.error('Error fetching Blogs:', error);
        });
    }
  // We add `id` to the dependency array. This tells React to re-run the effect
  // if the `id` from the URL ever changes.
  }, [params.id]);

  // While the data is being fetched, we can show a loading message.
  if (!blog) {
    return <div>Loading...</div>;
  }

  // Once the data is loaded, we display it.
  return (
    <div className="max-w-4xl mx-auto p-4 pt-6 md:p-6 lg:p-12">
      <div className="bg-white/10 backdrop-blur-xl border border-white/10 rounded-2xl p-6 sm:p-8 shadow-sm">
        <h1 className="text-3xl font-extrabold mb-4 text-sky-100">{blog.title}</h1>
      
      {/* Blog Images Carousel */}
      {(() => {
        const images = (blog.images && blog.images.length) ? blog.images : (blog.image_url ? [blog.image_url] : []);
        return images.length ? (
          <div className="mb-6">
            <Carousel images={images} alt={`Images for ${blog.title}`} />
          </div>
        ) : null;
      })()}
      <div className="text-lg text-slate-300 mb-6 whitespace-pre-wrap" style={{ tabSize: 4 }}>
        <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>
          {blog.content || ''}
        </ReactMarkdown>
      </div>
      <p className="text-sm text-slate-400">{new Date(blog.date).toLocaleString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })}</p>
      </div>
    </div>
  );
}
