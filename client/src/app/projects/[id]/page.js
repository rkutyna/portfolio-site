"use client";

// We import the hooks we need: `useParams` to read the URL, and our old friends `useState` and `useEffect`.
import { useParams } from 'next/navigation';
import { useState, useEffect } from 'react';

export default function ProjectPage() {
  // The `useParams` hook returns an object containing the route's dynamic parameters.
  // In our case, it will be an object like { id: '1' }.
  const { id } = useParams();

  // We set up state to hold our project's data.
  const [project, setProject] = useState(null);

  // We use useEffect to fetch the data for this specific project.
  useEffect(() => {
    // We only run the fetch if the `id` is available.
    if (id) {
      const fetchProject = async () => {
        try {
          const response = await fetch(`http://localhost:3001/api/projects/${id}`);
          const data = await response.json();
          setProject(data);
        } catch (error) {
          console.error('Error fetching project:', error);
        }
      };

      fetchProject();
    }
  // We add `id` to the dependency array. This tells React to re-run the effect
  // if the `id` from the URL ever changes.
  }, [id]);

  // While the data is being fetched, we can show a loading message.
  if (!project) {
    return <div>Loading...</div>;
  }

  // Once the data is loaded, we display it.
  return (
    <main className="p-8">
      <h1 className="text-4xl font-bold mb-4">{project.title}</h1>
      <p className="text-lg">{project.description}</p>
    </main>
  );
}
