// Home page.
//
// Rendered on the server so the copy, projects and blog list arrive with the
// HTML instead of appearing after a round of client-side fetches.
//
// Cached for an hour, and flushed on demand: the API server calls
// /api/revalidate after every admin write, so a new post appears on the next
// visit. A short time-based window alone served the pre-publish page to the
// first visits after publishing (stale while revalidating), which made new
// posts look missing. The hour is only a backstop in case that call fails.
import Hero from "./components/Hero";
import About from "./components/About";
import Contact from "./components/Contact";
import LatestPhotos from "./components/LatestPhotos";
import Projects from "./components/Projects";
import Blogs from "./components/Blogs";
import { getContent } from "../lib/content";

export const revalidate = 3600;

const apiBase = () =>
  process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || "http://server:3001/api";

async function getList(pathname) {
  try {
    const res = await fetch(`${apiBase()}${pathname}`, { next: { revalidate: 3600 } });
    if (!res.ok) throw new Error(`${pathname} responded ${res.status}`);
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (err) {
    // The builder may not reach the API; prerender empty lists and let the
    // boot-time flush (src/instrumentation.js) replace them.
    if (process.env.NEXT_PHASE === "phase-production-build") {
      console.error(`Failed to load ${pathname} at build time:`, err.message);
      return [];
    }
    // At runtime, fail the render rather than cache an empty list for the
    // next hour: Next.js keeps serving the last good page when a
    // regeneration throws.
    throw err;
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
      <About content={content} />
      <Projects projects={projects} heading={content.projects_heading} />
      <Blogs blogs={blogs} heading={content.blogs_heading} />
      <Contact content={content} />
      <LatestPhotos />
    </>
  );
}
