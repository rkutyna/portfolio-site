"use client";

// We import the hooks we need: `useParams` to read the URL, and our old friends `useState` and `useEffect`.
import { useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import Image from 'next/image'; // Import the Next.js Image component
import Carousel from '../../components/Carousel';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';

export default function ProjectPage() {
  // The `useParams` hook returns an object containing the route's dynamic parameters.
  // In our case, it will be an object like { id: '1' }.
  const params = useParams();

  // We set up state to hold our project's data.
  const [project, setProject] = useState(null);

  // We use useEffect to fetch the data for this specific project.
  useEffect(() => {
    // We only run the fetch if the `id` is available.
    if (params.id) {
      // Fetch data for the specific project
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/projects/${params.id}`)
        .then((res) => res.json())
        .then((data) => {
          setProject(data);
        })
        .catch((error) => {
          console.error('Error fetching project:', error);
        });
    }
  // We add `id` to the dependency array. This tells React to re-run the effect
  // if the `id` from the URL ever changes.
  }, [params.id]);

  // While the data is being fetched, we can show a loading message.
  if (!project) {
    return <div>Loading...</div>;
  }

  // Once the data is loaded, we display it.
  return (
    <div className="max-w-4xl mx-auto p-4 pt-6 md:p-6 lg:p-12">
      <div className="bg-white/10 backdrop-blur-xl border border-white/10 rounded-2xl p-6 sm:p-8 shadow-sm">
        <h1 className="text-3xl font-extrabold mb-4 text-sky-100">{project.title}</h1>
      
      {/* Project Images Carousel */}
      {(() => {
        const images = (project.images && project.images.length) ? project.images : (project.image_url ? [project.image_url] : []);
        return images.length ? (
          <div className="mb-6">
            <Carousel images={images} alt={`Images of ${project.title}`} />
          </div>
        ) : null;
      })()}

      <div className="text-lg text-slate-300 mb-6 whitespace-pre-wrap" style={{ tabSize: 4 }}>
        <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>
          {project.description || ''}
        </ReactMarkdown>
      </div>

      {/* External Project Link */}
      {project.project_url && (
        <a
          href={project.project_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-sky-200 bg-sky-300/10 border border-sky-400/20 rounded-lg px-4 py-2 shadow-sm hover:bg-sky-300/20 hover:border-sky-400/30 hover:shadow transition-colors duration-300 focus-visible:outline-2 focus-visible:outline-sky-400/60 focus-visible:outline-offset-2"
          aria-label="Open live project in a new tab"
        >
          View Live Project &rarr;
        </a>
      )}
      </div>
    </div>
  );
}
