"use client";

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import { normalizeMarkdown } from '../../lib/markdown';

// Target for the "Contact" nav link, which previously pointed at a section that
// did not exist on the page.
export default function Contact({ content }) {
  const [copied, setCopied] = useState(false);
  const email = content?.contact_email || '';
  if (!content?.contact_body && !email) return null;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(email);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      window.location.href = `mailto:${email}`;
    }
  };

  return (
    <section id="contact" className="py-12 scroll-mt-24">
      <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-center text-sky-100">
        {content.contact_heading}
      </h2>
      <div className="mt-3 h-1 w-20 bg-sky-400/70 rounded mx-auto" />
      <div className="mt-8 max-w-3xl mx-auto rounded-2xl bg-white/10 backdrop-blur-xl border border-white/10 p-6 sm:p-8 shadow-sm text-center">
        {content.contact_body ? (
          <div className="markdown-body text-slate-300 mb-6">
            <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>{normalizeMarkdown(content.contact_body)}</ReactMarkdown>
          </div>
        ) : null}
        {email ? (
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <a
              href={`mailto:${email}`}
              className="inline-flex items-center gap-2 bg-sky-600 hover:bg-sky-700 text-white font-medium py-2.5 px-5 rounded-lg shadow transition-colors"
            >
              Email {email}
            </a>
            <button
              type="button"
              onClick={copy}
              className="inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-4 py-2.5 text-sky-100 hover:bg-white/15 transition-colors"
            >
              {copied ? 'Copied!' : 'Copy address'}
            </button>
          </div>
        ) : null}
      </div>
    </section>
  );
}
