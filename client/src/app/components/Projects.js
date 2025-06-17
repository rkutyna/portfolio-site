import ProjectCard from './ProjectCard';
// 1. Import the Link component from Next.js
import Link from 'next/link';

// We update the function to accept an object with a `projects` property.
// This is called "destructuring props".
export default function Projects({ projects }) {
  return (
    <section id="projects" className="p-8">
      <h2 className="text-3xl font-bold text-center mb-8">My Projects</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {/* 
          We use the .map() method to loop over the `projects` array.
          For each `project` object in the array, we return a ProjectCard component.
        */}
        {projects.map(project => (
          // 2. Wrap the ProjectCard in a Link component.
          // - The `key` prop must be on the outermost element in a loop.
          // - The `href` uses a template literal to create a dynamic URL
          //   like "/projects/1", "/projects/2", etc.
          <Link key={project.id} href={`/projects/${project.id}`}>
            <ProjectCard 
              title={project.title} 
              description={project.description} 
            />
          </Link>
        ))}
      </div>
    </section>
  );
}