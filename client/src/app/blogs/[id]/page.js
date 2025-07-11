"use client";

// We import the hooks we need: `useParams` to read the URL, and our old friends `useState` and `useEffect`.
import { useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import Image from 'next/image'; // Import the Next.js Image component

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
    <div className="container mx-auto p-4 pt-6 md:p-6 lg:p-12">
      <h1 className="text-3xl font-bold mb-4">{blog.title}</h1>
      
      {/* Blog Image */}
      {blog.image_url && (
        <div className="relative w-full h-96 mb-6 rounded-lg overflow-hidden">
          <Image
            src={blog.image_url}
            alt={`Screenshot of ${blog.title}`}
            layout="fill"
            objectFit="contain"
            unoptimized // Add this prop to bypass Next.js image optimization
          />
        </div>
      )}

      <p className="text-lg text-gray-700 mb-6">{blog.content}</p>
      <p className="text-lg text-gray-700 mb-6">{new Date(blog.date).toLocaleString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })}</p>

      {/* External Project Link
      {project.project_url && (
        <a
          href={project.project_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block bg-blue-600 text-white font-bold py-2 px-4 rounded hover:bg-blue-700 transition-colors duration-300"
        >
          View Live Project &rarr;
        </a>
      )} */}
    </div>
  );
}
