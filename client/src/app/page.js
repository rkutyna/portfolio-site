// Home page.
//
// Rendered on the server so the copy, projects and blog list arrive with the
// HTML instead of appearing after a round of client-side fetches.
import Hero from "./components/Hero";
import About from "./components/About";
import Contact from "./components/Contact";
import LatestPhotos from "./components/LatestPhotos";
import Projects from "./components/Projects";
import Blogs from "./components/Blogs";
import { getContent } from "../lib/content";

const apiBase = () =>
  process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || "http://server:3001/api";

async function getList(pathname) {
  try {
    const res = await fetch(`${apiBase()}${pathname}`, { next: { revalidate: 30 } });
    if (!res.ok) throw new Error(`${pathname} responded ${res.status}`);
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.error(`Failed to load ${pathname}:`, err.message);
    return [];
  }
}

export default async function Home() {
  const [content, projects, blogs] = await Promise.all([
    getContent(),
    getList("/projects"),
    getList("/blogs"),
  ]);

  return (
    <>
      <Hero content={content} />
      <LatestPhotos />
      <About content={content} />
      <Projects projects={projects} heading={content.projects_heading} />
      <Blogs blogs={blogs} heading={content.blogs_heading} />
      <Contact content={content} />
    </>
  );
}
