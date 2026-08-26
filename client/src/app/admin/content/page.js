"use client";
import { useEffect, useState, useMemo, useCallback } from "react";
import { useAdminAuth, adminFetch, errorMessage } from "../useAdminAuth";
import AdminShell from "../AdminShell";
import Toast from "../Toast";
import { CONTENT_SECTIONS, CONTENT_DEFAULTS } from "../../../lib/content";

/**
 * Editor for every piece of copy on the site.
 *
 * Previously the only editable things were projects, blog posts and photos —
 * headings, the hero, the about and contact text and the footer were all
 * hardcoded in JSX and needed a rebuild to change.
 */
export default function AdminContentPage() {
  const verified = useAdminAuth();
  const [saved, setSaved] = useState(null); // last-known server state
  const [draft, setDraft] = useState(null);
  const [status, setStatus] = useState("loading");
  const [toast, setToast] = useState(null);
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState(CONTENT_SECTIONS[0].id);

  const load = useCallback(async () => {
    setStatus("loading");
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/content`);
      if (!res.ok) throw new Error(await errorMessage(res, "Could not load site text"));
      const data = await res.json();
      const merged = { ...CONTENT_DEFAULTS, ...data };
      setSaved(merged);
      setDraft(merged);
      setStatus("ready");
    } catch (err) {
      setToast({ tone: "error", message: err.message });
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    if (verified) load();
  }, [verified, load]);

  // Only send keys that actually changed, so two people editing different
  // sections cannot clobber each other's work.
  const dirtyKeys = useMemo(() => {
    if (!saved || !draft) return [];
    return Object.keys(draft).filter((key) => draft[key] !== saved[key]);
  }, [draft, saved]);

  const isDirty = dirtyKeys.length > 0;

  // Warn before navigating away from unsaved edits.
  useEffect(() => {
    if (!isDirty) return;
    const handler = (e) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  const setField = (key, value) => setDraft((d) => ({ ...d, [key]: value }));

  const handleSave = async (e) => {
    e?.preventDefault();
    if (!isDirty) return;
    setSaving(true);
    setToast(null);
    try {
      const payload = Object.fromEntries(dirtyKeys.map((k) => [k, draft[k]]));
      const res = await adminFetch("/content", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await errorMessage(res, "Failed to save site text"));
      const updated = await res.json();
      const merged = { ...CONTENT_DEFAULTS, ...updated };
      setSaved(merged);
      setDraft(merged);
      setToast({
        tone: "success",
        message: `Saved ${dirtyKeys.length} change${dirtyKeys.length === 1 ? "" : "s"}. The site updates within about 30 seconds.`,
      });
    } catch (err) {
      setToast({ tone: "error", message: err.message });
    } finally {
      setSaving(false);
    }
  };

  const resetField = (key) => setField(key, saved?.[key] ?? CONTENT_DEFAULTS[key]);
  const restoreDefault = (key) => setField(key, CONTENT_DEFAULTS[key]);

  if (!verified) return null;

  const section = CONTENT_SECTIONS.find((s) => s.id === activeSection) || CONTENT_SECTIONS[0];

  return (
    <AdminShell
      title="Site Text"
      description="Edit any wording on the site. Changes go live without a rebuild."
      actions={
        <>
          {isDirty && (
            <span className="text-xs text-amber-200 bg-amber-400/10 border border-amber-400/30 rounded-full px-3 py-1">
              {dirtyKeys.length} unsaved
            </span>
          )}
          <button
            onClick={handleSave}
            disabled={!isDirty || saving}
            className="rounded-lg bg-sky-600/90 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {saving ? "Saving..." : "Save changes"}
          </button>
        </>
      }
    >
      <Toast {...(toast || {})} onDismiss={() => setToast(null)} />

      {status === "loading" ? (
        <div className="space-y-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-24 rounded-xl bg-white/10 animate-pulse" />
          ))}
        </div>
      ) : status === "error" ? (
        <button onClick={load} className="text-sky-300 underline">
          Retry
        </button>
      ) : (
        <div className="grid gap-6 md:grid-cols-[200px_1fr]">
          <aside>
            <ul className="space-y-1 sticky top-24">
              {CONTENT_SECTIONS.map((s) => {
                const sectionDirty = s.fields.some((f) => dirtyKeys.includes(f.key));
                return (
                  <li key={s.id}>
                    <button
                      onClick={() => setActiveSection(s.id)}
                      className={`w-full text-left rounded-lg px-3 py-2 text-sm transition-colors flex items-center justify-between gap-2 ${
                        s.id === activeSection
                          ? "bg-sky-500/15 text-sky-100 border border-sky-400/40"
                          : "text-slate-300 hover:bg-white/5 border border-transparent"
                      }`}
                    >
                      {s.label}
                      {sectionDirty && <span className="h-2 w-2 rounded-full bg-amber-400" aria-label="unsaved" />}
                    </button>
                  </li>
                );
              })}
            </ul>
          </aside>

          <form onSubmit={handleSave} className="rounded-xl border border-white/10 bg-white/10 backdrop-blur-xl p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-sky-100">{section.label}</h2>
            {section.description ? (
              <p className="text-sm text-slate-400 mt-1 mb-6">{section.description}</p>
            ) : (
              <div className="mb-6" />
            )}

            <div className="space-y-6">
              {section.fields.map((field) => {
                const value = draft[field.key] ?? "";
                const changed = dirtyKeys.includes(field.key);
                const isDefault = value === CONTENT_DEFAULTS[field.key];
                return (
                  <div key={field.key}>
                    <div className="flex items-baseline justify-between gap-3 mb-1.5">
                      <label htmlFor={field.key} className="text-sm font-medium text-sky-100">
                        {field.label}
                        {changed && <span className="ml-2 text-xs text-amber-300">edited</span>}
                      </label>
                      <div className="flex items-center gap-3 text-xs">
                        {changed && (
                          <button type="button" onClick={() => resetField(field.key)} className="text-slate-400 hover:text-sky-300">
                            Undo
                          </button>
                        )}
                        {!isDefault && (
                          <button type="button" onClick={() => restoreDefault(field.key)} className="text-slate-400 hover:text-sky-300">
                            Restore default
                          </button>
                        )}
                      </div>
                    </div>

                    {field.type === "textarea" ? (
                      <textarea
                        id={field.key}
                        rows={field.rows || 4}
                        value={value}
                        onChange={(e) => setField(field.key, e.target.value)}
                        className={`w-full rounded-lg border bg-white/5 px-3 py-2 text-sky-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-400/50 ${
                          changed ? "border-amber-400/40" : "border-white/15"
                        }`}
                      />
                    ) : (
                      <input
                        id={field.key}
                        type="text"
                        value={value}
                        onChange={(e) => setField(field.key, e.target.value)}
                        className={`w-full rounded-lg border bg-white/5 px-3 py-2 text-sky-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-400/50 ${
                          changed ? "border-amber-400/40" : "border-white/15"
                        }`}
                      />
                    )}

                    <div className="mt-1.5 flex items-center justify-between gap-3 text-xs text-slate-500">
                      <span>
                        {field.hint}
                        {field.markdown ? (field.hint ? " · " : "") + "Markdown supported." : ""}
                      </span>
                      <span className="tabular-nums">{value.length}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-8 flex items-center gap-3 border-t border-white/10 pt-6">
              <button
                type="submit"
                disabled={!isDirty || saving}
                className="rounded-lg bg-sky-600/90 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {saving ? "Saving..." : "Save changes"}
              </button>
              {isDirty && (
                <button
                  type="button"
                  onClick={() => setDraft(saved)}
                  className="rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm text-slate-300 hover:bg-white/10"
                >
                  Discard all changes
                </button>
              )}
            </div>
          </form>
        </div>
      )}
    </AdminShell>
  );
}
