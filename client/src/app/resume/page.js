import { getContent } from "../../lib/content";

export async function generateMetadata() {
  const content = await getContent();
  return {
    title: `${content.resume_heading} | ${content.brand_name}`,
    description: `Resume for ${content.brand_name}`,
  };
}

export default async function ResumePage() {
  const content = await getContent();
  const pdfPath = `${process.env.NEXT_PUBLIC_API_URL}/resume`;

  return (
    <div className="max-w-5xl mx-auto p-4 pt-6 md:p-6 lg:p-12">
      <div className="bg-white/10 backdrop-blur-xl border border-white/10 rounded-2xl p-4 sm:p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-3xl font-extrabold text-sky-100">{content.resume_heading}</h1>
          <div className="flex gap-2">
            <a
              href={pdfPath}
              download
              className="inline-flex items-center gap-2 text-sky-200 bg-sky-300/10 border border-sky-400/20 rounded-lg px-4 py-2 shadow-sm hover:bg-sky-300/20 hover:border-sky-400/30 transition-colors"
            >
              Download PDF
            </a>
            <a
              href={pdfPath}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sky-200 bg-sky-300/10 border border-sky-400/20 rounded-lg px-4 py-2 shadow-sm hover:bg-sky-300/20 hover:border-sky-400/30 transition-colors"
            >
              Open Fullscreen →
            </a>
          </div>
        </div>

        {/* PDF embed */}
        <div className="w-full rounded-lg overflow-hidden border border-white/10 bg-black/20" style={{ height: "80vh" }}>
          <object data={pdfPath} type="application/pdf" className="w-full h-full">
            <iframe src={pdfPath} className="w-full h-full" title="Resume PDF" />
          </object>
        </div>

        <p className="mt-3 text-sm text-slate-400">
          If the PDF does not display, use the &quot;Open Fullscreen&quot; button above.
        </p>
      </div>
    </div>
  );
}
