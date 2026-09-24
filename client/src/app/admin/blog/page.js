"use client";
import { useEffect, useState, useCallback } from "react";
import { useAdminAuth, adminFetch, errorMessage } from "../useAdminAuth";
import AdminShell from "../AdminShell";
import Toast from "../Toast";
import { MarkdownEditor } from "../MarkdownPreview";
import ImageOrder, { moveItem } from "../ImageOrder";
import { formatDate } from '../../../lib/dates';

const EMPTY = { title: "", content: "", images: [] };

export default function AdminBlogPage() {
  const verified = useAdminAuth();
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [previewUrls, setPreviewUrls] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState({ title: "", content: "", images: [] });
  const [editOriginal, setEditOriginal] = useState(null);

  const fetchBlogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/blogs`);
      if (!res.ok) throw new Error(await errorMessage(res, "Failed to fetch blog posts"));
      setBlogs(await res.json());
    } catch (err) {
      setToast({ tone: "error", message: err.message });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (verified) fetchBlogs();
  }, [verified, fetchBlogs]);

  useEffect(() => {
    if (!form.images.length) {
      setPreviewUrls([]);
      return;
    }
    const urls = form.images.map((file) => URL.createObjectURL(file));
    setPreviewUrls(urls);
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, [form.images]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setToast(null);
    try {
      const formData = new FormData();
      formData.append("title", form.title);
      formData.append("content", form.content);
      form.images.forEach((file) => formData.append("images", file));
      const res = await adminFetch("/blogs", { method: "POST", body: formData });
      if (!res.ok) throw new Error(await errorMessage(res, "Failed to create post"));
      setForm(EMPTY);
      setToast({ tone: "success", message: "Post published." });
      fetchBlogs();
    } catch (err) {
      setToast({ tone: "error", message: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (blog) => {
    if (!confirm(`Delete "${blog.title}"? This cannot be undone.`)) return;
    try {
      const res = await adminFetch(`/blogs/${blog.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await errorMessage(res, "Failed to delete post"));
      setToast({ tone: "success", message: "Post deleted." });
      fetchBlogs();
    } catch (err) {
      setToast({ tone: "error", message: err.message });
    }
  };

  const startEdit = (blog) => {
    const initial = { title: blog.title || "", content: blog.content || "", images: blog.images || [] };
    setEditId(blog.id);
    setEditForm(initial);
    setEditOriginal(initial);
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      // Saving text stamps the post with a new date, so skip that request when
      // only the image order changed.
      if (editForm.title !== editOriginal.title || editForm.content !== editOriginal.content) {
        const res = await adminFetch(`/blogs/${editId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: editForm.title, content: editForm.content }),
        });
        if (!res.ok) throw new Error(await errorMessage(res, "Failed to update post"));
      }
      if (editForm.images.join("\n") !== editOriginal.images.join("\n")) {
        const res = await adminFetch(`/blogs/${editId}/images/order`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ images: editForm.images }),
        });
        if (!res.ok) throw new Error(await errorMessage(res, "Failed to save image order"));
      }
      setEditId(null);
      setToast({ tone: "success", message: "Saved." });
      fetchBlogs();
    } catch (err) {
      setToast({ tone: "error", message: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!verified) return null;

  return (
    <AdminShell title="Blog Posts" description="Posts are written in Markdown and rendered with GitHub-flavoured formatting.">
      <Toast {...(toast || {})} onDismiss={() => setToast(null)} />

      <form className="rounded-xl border border-white/10 bg-white/10 backdrop-blur-xl p-6 shadow-sm mb-10" onSubmit={handleCreate}>
        <h2 className="text-xl font-semibold mb-4 text-sky-100">New post</h2>
        <input
          className="w-full mb-4 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sky-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-400/50"
          placeholder="Title"
          value={form.title}
          onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          required
        />

        <MarkdownEditor
          placeholder="Write your post…"
          rows={14}
          value={form.content}
          onChange={(content) => setForm((f) => ({ ...f, content }))}
          required
        />

        <div className="mt-4">
          <label className="block text-sm text-slate-400 mb-1.5">Images (optional, JPEG)</label>
          <input
            type="file"
            accept=".jpg,.jpeg,image/jpeg"
            multiple
            className="w-full text-slate-200 file:mr-4 file:py-2 file:px-3 file:rounded file:border-0 file:bg-sky-700/70 file:text-white hover:file:bg-sky-600/70"
            onChange={(e) => setForm((f) => ({ ...f, images: Array.from(e.target.files || []) }))}
          />
        </div>

        {previewUrls.length > 0 && (
          <div className="mt-4">
            <ImageOrder
              images={previewUrls}
              onMove={(from, to) => setForm((f) => ({ ...f, images: moveItem(f.images, from, to) }))}
            />
          </div>
        )}

        <button
          type="submit"
          className="mt-6 rounded-lg bg-sky-600/90 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-40"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Publishing…" : "Publish post"}
        </button>
      </form>

      <h2 className="text-xl font-semibold mb-4 text-sky-100">
        Published {blogs.length ? <span className="text-slate-500 text-base">({blogs.length})</span> : null}
      </h2>

      {loading ? (
        <div className="space-y-3">
          {[0, 1].map((i) => <div key={i} className="h-24 rounded-xl bg-white/10 animate-pulse" />)}
        </div>
      ) : blogs.length === 0 ? (
        <p className="text-slate-400">No posts yet.</p>
      ) : (
        <ul className="space-y-4">
          {blogs.map((blog) => (
            <li key={blog.id} className="rounded-xl border border-white/10 bg-white/10 backdrop-blur-xl p-5">
              {editId === blog.id ? (
                <form className="space-y-3" onSubmit={handleEdit}>
                  <input
                    className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sky-100 focus:outline-none focus:ring-2 focus:ring-sky-400/50"
                    value={editForm.title}
                    onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
                    required
                  />
                  <MarkdownEditor
                    value={editForm.content}
                    onChange={(content) => setEditForm((f) => ({ ...f, content }))}
                    required
                  />
                  <ImageOrder
                    images={editForm.images}
                    onMove={(from, to) => setEditForm((f) => ({ ...f, images: moveItem(f.images, from, to) }))}
                  />
                  <div className="flex gap-2">
                    <button type="submit" disabled={isSubmitting} className="rounded-lg bg-emerald-600/80 px-3 py-1.5 text-sm text-white hover:bg-emerald-500/80 disabled:opacity-40">
                      Save
                    </button>
                    <button type="button" onClick={() => setEditId(null)} className="rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-sm text-slate-300 hover:bg-white/10">
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="font-bold text-lg text-sky-100">{blog.title}</div>
                      {blog.date && (
                        <div className="text-xs text-slate-500 mt-0.5">
                          {formatDate(blog.date)}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button onClick={() => startEdit(blog)} className="rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-sm text-sky-100 hover:bg-white/10">
                        Edit
                      </button>
                      <a href={`/blogs/${blog.id}`} target="_blank" rel="noreferrer" className="rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-sm text-sky-100 hover:bg-white/10">
                        View
                      </a>
                      <button onClick={() => handleDelete(blog)} className="rounded-lg border border-rose-400/30 bg-rose-500/10 px-3 py-1.5 text-sm text-rose-200 hover:bg-rose-500/20">
                        Delete
                      </button>
                    </div>
                  </div>
                  <p className="mt-2 text-slate-400 text-sm line-clamp-3 whitespace-pre-wrap">{blog.content}</p>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </AdminShell>
  );
}
