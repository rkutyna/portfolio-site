import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import { normalizeMarkdown } from '../../lib/markdown';

// Target for the "About" nav link, which previously pointed at a section that
// did not exist on the page.
export default function About({ content }) {
  if (!content?.about_body) return null;
  return (
    <section id="about" className="py-12 scroll-mt-24">
      <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-center text-sky-100">
        {content.about_heading}
      </h2>
      <div className="mt-3 h-1 w-20 bg-sky-400/70 rounded mx-auto" />
      <div className="mt-8 max-w-3xl mx-auto rounded-2xl bg-white/10 backdrop-blur-xl border border-white/10 p-6 sm:p-8 shadow-sm">
        <div className="markdown-body text-slate-300">
          <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>{normalizeMarkdown(content.about_body)}</ReactMarkdown>
        </div>
      </div>
    </section>
  );
}
