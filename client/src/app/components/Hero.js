"use client";

import { useState } from "react";

export default function Hero({ content }) {
  const [copied, setCopied] = useState(false);
  const email = content?.contact_email || "";

  const handleContactClick = async () => {
    if (!email) return;
    try {
      await navigator.clipboard.writeText(email);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      window.location.href = `mailto:${email}`;
    }
  };

  return (
    <section className="text-center mt-8 mb-10 rounded-2xl p-10 sm:p-16 bg-white/10 backdrop-blur-xl border border-white/10 shadow-sm">
      <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-sky-100">
        {content?.hero_title}
      </h1>
      {content?.hero_subtitle ? (
        <p className="text-lg sm:text-xl mt-4 text-slate-300 max-w-3xl mx-auto whitespace-pre-wrap">
          {content.hero_subtitle}
        </p>
      ) : null}
      <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
        {content?.hero_primary_label ? (
          <a
            href={content.hero_primary_href || "#projects"}
            className="inline-flex items-center gap-2 bg-sky-600 hover:bg-sky-700 text-white font-medium py-2.5 px-5 rounded-lg shadow transition-colors"
          >
            {content.hero_primary_label}
            <span aria-hidden>→</span>
          </a>
        ) : null}
        {email ? (
          <button
            type="button"
            onClick={handleContactClick}
            className="inline-flex items-center gap-2 bg-sky-600 hover:bg-sky-700 text-white font-medium py-2.5 px-5 rounded-lg shadow transition-colors"
          >
            {copied ? "Copied to clipboard!" : `Contact Me @ ${email}`}
          </button>
        ) : null}
      </div>
    </section>
  );
}
