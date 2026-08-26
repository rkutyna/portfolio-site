"use client";
import Link from "next/link";
import { useState, useEffect, useCallback } from "react";
import { useAdminAuth, adminFetch, errorMessage } from "./useAdminAuth";
import AdminShell from "./AdminShell";
import Toast from "./Toast";
import { formatDateTime } from '../../lib/dates';

const SECTIONS = [
  { href: "/admin/content", label: "Site Text", description: "Headings, hero, about, contact, footer.", icon: "📝" },
  { href: "/admin/projects", label: "Projects", description: "Portfolio projects with images and video.", icon: "🗂️" },
  { href: "/admin/blog", label: "Blog Posts", description: "Write and manage posts in Markdown.", icon: "✍️" },
  { href: "/admin/photos", label: "Photos", description: "Gallery uploads (JPEG, RAW, HEIC).", icon: "📷" },
  { href: "/admin/resume", label: "Resume", description: "Replace the published PDF.", icon: "📄" },
];

function StatCard({ label, value, hint }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/10 backdrop-blur-xl p-4">
      <div className="text-2xl font-bold text-sky-100 tabular-nums">{value}</div>
      <div className="text-sm text-slate-300">{label}</div>
      {hint ? <div className="text-xs text-slate-500 mt-1">{hint}</div> : null}
    </div>
  );
}

export default function AdminHub() {
  const verified = useAdminAuth();
  const [analytics, setAnalytics] = useState(null);
  const [counts, setCounts] = useState(null);
  const [toast, setToast] = useState(null);

  const load = useCallback(async () => {
    try {
      const res = await adminFetch("/analytics");
      if (!res.ok) throw new Error(await errorMessage(res, "Could not load analytics"));
      const data = await res.json();
      setAnalytics(data && data.resources ? data : { resources: [], countries: [] });
    } catch (err) {
      setToast({ tone: "error", message: err.message });
      setAnalytics({ resources: [], countries: [] });
    }

    // Content counts come from the public endpoints; they are cheap and give
    // the overview something useful at a glance.
    try {
      const base = process.env.NEXT_PUBLIC_API_URL;
      const [projects, blogs, photos] = await Promise.all(
        ["/projects", "/blogs", "/photos"].map((p) => fetch(`${base}${p}`).then((r) => r.json()))
      );
      const photoList = Array.isArray(photos) ? photos : [];
      setCounts({
        projects: Array.isArray(projects) ? projects.length : 0,
        blogs: Array.isArray(blogs) ? blogs.length : 0,
        photoSets: photoList.length,
        photoFiles: photoList.reduce((sum, g) => sum + (g.image_urls?.length || 0), 0),
        pending: photoList.reduce((sum, g) => sum + Number(g.pending_count || 0), 0),
      });
    } catch {
      /* counts are optional */
    }
  }, []);

  useEffect(() => {
    if (verified) load();
  }, [verified, load]);

  if (!verified) return null;

  const totalHuman = analytics?.resources?.reduce((s, r) => s + Number(r.human_views || 0), 0) ?? 0;

  return (
    <AdminShell title="Overview" description="Everything you can change about the site lives behind these sections.">
      <Toast {...(toast || {})} onDismiss={() => setToast(null)} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Projects" value={counts?.projects ?? "—"} />
        <StatCard label="Blog posts" value={counts?.blogs ?? "—"} />
        <StatCard
          label="Photo sets"
          value={counts?.photoSets ?? "—"}
          hint={counts ? `${counts.photoFiles} images${counts.pending ? `, ${counts.pending} processing` : ""}` : null}
        />
        <StatCard label="Human page views" value={totalHuman || "—"} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 mb-10">
        {SECTIONS.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className="flex items-start gap-4 rounded-xl border border-white/10 bg-white/10 backdrop-blur-xl p-5 shadow-sm hover:bg-white/15 transition-colors"
          >
            <span className="text-2xl mt-0.5" aria-hidden>{s.icon}</span>
            <div className="min-w-0">
              <div className="font-semibold text-sky-100">{s.label}</div>
              <div className="text-slate-300 text-sm">{s.description}</div>
            </div>
            <span className="ml-auto text-slate-500 self-center" aria-hidden>→</span>
          </Link>
        ))}
      </div>

      <section>
        <h2 className="text-xl font-semibold mb-3 text-sky-200">Page Views</h2>
        {!analytics ? (
          <p className="text-slate-400 text-sm">Loading analytics…</p>
        ) : analytics.resources.length === 0 ? (
          <p className="text-slate-400 text-sm">No views recorded yet.</p>
        ) : (
          <>
            <div className="overflow-x-auto rounded-xl border border-white/10 mb-6">
              <table className="w-full text-sm text-left">
                <thead className="bg-white/10 text-sky-200 uppercase text-xs">
                  <tr>
                    <th className="px-4 py-2">Type</th>
                    <th className="px-4 py-2">Title</th>
                    <th className="px-4 py-2 text-right">Human</th>
                    <th className="px-4 py-2 text-right">Bot</th>
                    <th className="px-4 py-2 text-right">Total</th>
                    <th className="px-4 py-2">Last Seen</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.resources.map((row) => (
                    <tr key={`${row.resource_type}-${row.resource_id}`} className="border-t border-white/5 hover:bg-white/5">
                      <td className="px-4 py-2 capitalize text-slate-400">{row.resource_type}</td>
                      <td className="px-4 py-2 text-sky-100">{row.title || `#${row.resource_id}`}</td>
                      <td className="px-4 py-2 text-right text-green-400 font-semibold tabular-nums">{row.human_views}</td>
                      <td className="px-4 py-2 text-right text-slate-500 tabular-nums">{row.bot_views}</td>
                      <td className="px-4 py-2 text-right text-slate-300 tabular-nums">{row.total_views}</td>
                      <td className="px-4 py-2 text-slate-400 text-xs">
                        {row.last_viewed_at
                          ? formatDateTime(row.last_viewed_at)
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {analytics.countries.length > 0 && (
              <>
                <h3 className="text-base font-semibold mb-2 text-sky-300">Views by Country</h3>
                <div className="overflow-x-auto rounded-xl border border-white/10">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-white/10 text-sky-200 uppercase text-xs">
                      <tr>
                        <th className="px-4 py-2">Country</th>
                        <th className="px-4 py-2 text-right">Human</th>
                        <th className="px-4 py-2 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analytics.countries.map((row) => (
                        <tr key={row.country} className="border-t border-white/5 hover:bg-white/5">
                          <td className="px-4 py-2 text-sky-100">{row.country}</td>
                          <td className="px-4 py-2 text-right text-green-400 font-semibold tabular-nums">{row.human_views}</td>
                          <td className="px-4 py-2 text-right text-slate-300 tabular-nums">{row.total_views}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </>
        )}
      </section>
    </AdminShell>
  );
}
