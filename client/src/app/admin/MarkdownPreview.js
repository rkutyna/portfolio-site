"use client";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import { normalizeMarkdown } from "../../lib/markdown";

/**
 * Live Markdown preview for the admin editors. Uses the same plugins and
 * normalization as the public detail pages, so a pasted URL shows up as the
 * link it will publish as rather than plain text in a textarea.
 */
export default function MarkdownPreview({ value }) {
  if (!value?.trim()) {
    return <p className="text-slate-500 text-sm italic">Nothing to preview yet.</p>;
  }
  return (
    <div className="markdown-body text-slate-300">
      <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>{normalizeMarkdown(value)}</ReactMarkdown>
    </div>
  );
}

/** Editor textarea with a preview beside it (below it on narrow screens). */
export function MarkdownEditor({ value, onChange, rows = 12, placeholder, required, label = "Content (Markdown)" }) {
  return (
    <div>
      <span className="block mb-1.5 text-sm text-slate-400">{label}</span>
      <div className="grid gap-4 lg:grid-cols-2">
        <textarea
          className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 font-mono text-sm text-sky-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-400/50"
          placeholder={placeholder}
          rows={rows}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
        />
        <div className="rounded-lg border border-white/15 bg-white/5 p-4 overflow-y-auto max-h-[22rem]">
          <div className="mb-2 text-[11px] uppercase tracking-wider text-slate-500">Preview</div>
          <MarkdownPreview value={value} />
        </div>
      </div>
    </div>
  );
}
