import Image from "next/image";
import { getContent } from "../../lib/content";

// Server-side fetches go to the API container directly; the URLs it returns are
// still public ones, built from API_SERVER_URL.
const apiBase = () =>
  process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || "http://server:3001/api";

async function getResumePages() {
  try {
    const res = await fetch(`${apiBase()}/resume/pages`, { next: { revalidate: 30 } });
    if (!res.ok) throw new Error(`resume/pages responded ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error("Failed to load resume pages:", err.message);
    return { pages: [], pending: false };
  }
}

export async function generateMetadata() {
  const content = await getContent();
  return {
    title: `${content.resume_heading} | ${content.brand_name}`,
    description: `Resume for ${content.brand_name}`,
  };
}

export default async function ResumePage() {
  const [content, resume] = await Promise.all([getContent(), getResumePages()]);
  const pdfPath = `${process.env.NEXT_PUBLIC_API_URL}/resume`;
  const pages = resume.pages || [];

  return (
    <div className="max-w-5xl mx-auto p-4 pt-6 md:p-6 lg:p-12">
      <div className="bg-white/10 backdrop-blur-xl border border-white/10 rounded-2xl p-4 sm:p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <h1 className="text-3xl font-extrabold text-sky-100">{content.resume_heading}</h1>
          <div className="flex flex-wrap gap-2">
            <a
              href={pdfPath}
              download="roger-kutyna-resume.pdf"
              className="inline-flex items-center gap-2 text-sky-200 bg-sky-300/10 border border-sky-400/20 rounded-lg px-4 py-2 shadow-sm hover:bg-sky-300/20 hover:border-sky-400/30 transition-colors"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Download PDF
            </a>
            <a
              href={pdfPath}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sky-200 bg-sky-300/10 border border-sky-400/20 rounded-lg px-4 py-2 shadow-sm hover:bg-sky-300/20 hover:border-sky-400/30 transition-colors"
            >
              Open PDF
              <span aria-hidden>↗</span>
            </a>
          </div>
        </div>

        {pages.length > 0 ? (
          <div className="flex flex-col gap-6">
            {pages.map((page, i) => (
              <div
                key={page.url}
                className="relative rounded-lg overflow-hidden border border-white/10 bg-white shadow-lg"
              >
                <Image
                  src={page.url}
                  alt={
                    pages.length > 1
                      ? `${content.resume_heading}, page ${i + 1} of ${pages.length}`
                      : content.resume_heading
                  }
                  width={page.width}
                  height={page.height}
                  className="w-full h-auto"
                  sizes="(max-width: 1024px) 100vw, 900px"
                  priority={i === 0}
                  unoptimized
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-white/10 bg-white/5 p-10 text-center">
            <p className="text-slate-300">
              {resume.pending
                ? "The resume preview is still being generated. It should appear within a minute."
                : "No resume has been uploaded yet."}
            </p>
            {resume.pending ? (
              <a href={pdfPath} target="_blank" rel="noopener noreferrer" className="mt-4 inline-block text-sky-300 hover:text-sky-200 underline">
                Open the PDF directly
              </a>
            ) : null}
          </div>
        )}

        {pages.length > 0 ? (
          <p className="mt-4 text-sm text-slate-400">
            Shown as {pages.length === 1 ? "an image" : "images"} so it renders on every device.
            Use Download PDF or Open PDF for the original, with selectable text.
          </p>
        ) : null}
      </div>
    </div>
  );
}
