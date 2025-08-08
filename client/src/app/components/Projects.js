import ProjectCard from './ProjectCard';
// Import the Link component from Next.js
import Link from 'next/link';

// Accepts an object with a `projects` property (destructuring props).
export default function Projects({ projects }) {
  return (
    <section id="projects" className="py-10 scroll-mt-24">
      <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-center text-sky-100">
        My Projects
      </h2>
      <div className="mt-3 h-1 w-20 bg-sky-400/70 rounded mx-auto" />
      
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {/* Map over `projects` and render a ProjectCard for each */}
        {projects.map((project) => (
          // Wrap each ProjectCard in a Link to its detail page.
          <Link key={project.id} href={`/projects/${project.id}`}>
            <ProjectCard 
              title={project.title} 
              description={project.description} 
              imageUrl={project.image_url}
              projectUrl={project.project_url}
            />
          </Link>
        ))}
      </div>
    </section>
  );
}