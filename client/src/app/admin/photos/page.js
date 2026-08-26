"use client";
import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import { useAdminAuth, adminFetch, errorMessage } from "../useAdminAuth";
import AdminShell from "../AdminShell";
import Toast from "../Toast";
import { groupImages, formatBytes } from "../../../lib/photos";

const ACCEPT = ".jpg,.jpeg,.heic,.heif,.nef,.dng,.cr2,.cr3,.arw,.rw2,.orf,.raf,.srw";
// Cloudflare caps a request body at 100MB; stay comfortably under it.
const BATCH_LIMIT = 80 * 1024 * 1024;

const splitIntoBatches = (files) => {
  const batches = [];
  let current = [];
  let size = 0;
  for (const file of files) {
    if (current.length > 0 && size + file.size > BATCH_LIMIT) {
      batches.push(current);
      current = [];
      size = 0;
    }
    current.push(file);
    size += file.size;
  }
  if (current.length) batches.push(current);
  return batches;
};

export default function AdminPhotosPage() {
  const verified = useAdminAuth();
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [form, setForm] = useState({ title: "", caption: "", files: [] });
  const [previews, setPreviews] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [progress, setProgress] = useState(null);
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState({ title: "", caption: "", groupId: null });
  const [dragging, setDragging] = useState(false);

  const fetchPhotos = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/photos`);
      if (!res.ok) throw new Error(await errorMessage(res, "Failed to fetch photos"));
      setPhotos(await res.json());
    } catch (err) {
      setToast({ tone: "error", message: err.message });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (verified) fetchPhotos();
  }, [verified, fetchPhotos]);

  // Local object URLs for the upload preview strip.
  useEffect(() => {
    if (!form.files.length) {
      setPreviews([]);
      return;
    }
    const urls = form.files.map((file) => URL.createObjectURL(file));
    setPreviews(urls);
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, [form.files]);

  const addFiles = (incoming) => {
    const list = Array.from(incoming || []).filter((f) => f.size > 0);
    if (!list.length) return;
    setForm((f) => ({ ...f, files: [...f.files, ...list] }));
  };

  const removeFile = (index) =>
    setForm((f) => ({ ...f, files: f.files.filter((_, i) => i !== index) }));

  const totalBytes = form.files.reduce((s, f) => s + f.size, 0);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.files.length) {
      setToast({ tone: "error", message: "Select at least one photo first." });
      return;
    }
    setIsSubmitting(true);
    setToast(null);

    const batches = splitIntoBatches(form.files);
    const groupId = crypto.randomUUID();
    try {
      for (let i = 0; i < batches.length; i++) {
        setProgress({ current: i + 1, total: batches.length });
        const formData = new FormData();
        if (form.title) formData.append("title", form.title);
        if (form.caption) formData.append("caption", form.caption);
        formData.append("upload_group_id", groupId);
        batches[i].forEach((file) => formData.append("photos", file));
        const res = await adminFetch("/photos", { method: "POST", body: formData });
        if (!res.ok) {
          throw new Error(await errorMessage(res, `Batch ${i + 1} of ${batches.length} failed to upload`));
        }
      }
      setForm({ title: "", caption: "", files: [] });
      setToast({
        tone: "success",
        message: "Uploaded. Thumbnails are generated in the background and appear within a minute.",
      });
      fetchPhotos();
    } catch (err) {
      setToast({ tone: "error", message: err.message });
    } finally {
      setIsSubmitting(false);
      setProgress(null);
    }
  };

  const handleDelete = async (photo) => {
    const count = photo.image_urls?.length || 1;
    // The old confirm said "Delete this photo?" while actually deleting the
    // whole upload group. Say what will really happen.
    const message =
      count > 1
        ? `Delete "${photo.title || "Untitled"}" and all ${count} of its photos? This cannot be undone.`
        : `Delete "${photo.title || "Untitled"}"? This cannot be undone.`;
    if (!confirm(message)) return;
    try {
      const path = photo.upload_group_id
        ? `/photos/group/${photo.upload_group_id}`
        : `/photos/${photo.id}`;
      const res = await adminFetch(path, { method: "DELETE" });
      if (!res.ok) throw new Error(await errorMessage(res, "Failed to delete photo"));
      setToast({ tone: "success", message: `Deleted ${count} photo${count === 1 ? "" : "s"}.` });
      fetchPhotos();
    } catch (err) {
      setToast({ tone: "error", message: err.message });
    }
  };

  const startEdit = (photo) => {
    setEditId(photo.id);
    setEditForm({
      title: photo.title || "",
      caption: photo.caption || "",
      groupId: photo.upload_group_id || null,
    });
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      // Title and caption belong to the set, so write them to every row in the
      // group — editing only the first row left the rest inconsistent.
      const path = editForm.groupId ? `/photos/group/${editForm.groupId}` : `/photos/${editId}`;
      const res = await adminFetch(path, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: editForm.title || null, caption: editForm.caption || null }),
      });
      if (!res.ok) throw new Error(await errorMessage(res, "Failed to update photo"));
      setEditId(null);
      setToast({ tone: "success", message: "Saved." });
      fetchPhotos();
    } catch (err) {
      setToast({ tone: "error", message: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!verified) return null;

  return (
    <AdminShell title="Photos" description="Upload sets of photos and edit their titles and captions.">
      <Toast {...(toast || {})} onDismiss={() => setToast(null)} />

      <form
        className="rounded-xl border border-white/10 bg-white/10 backdrop-blur-xl p-6 shadow-sm mb-10"
        onSubmit={handleCreate}
      >
        <h2 className="text-xl font-semibold mb-4 text-sky-100">Upload a new set</h2>
        <div className="grid gap-4 sm:grid-cols-2 mb-4">
          <input
            className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sky-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-400/50"
            placeholder="Title (optional)"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          />
          <textarea
            className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sky-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-400/50 sm:row-span-2"
            placeholder="Caption (optional)"
            rows={3}
            value={form.caption}
            onChange={(e) => setForm((f) => ({ ...f, caption: e.target.value }))}
          />
        </div>

        <label
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files); }}
          className={`block cursor-pointer rounded-lg border-2 border-dashed px-4 py-8 text-center transition-colors ${
            dragging ? "border-sky-400 bg-sky-500/10" : "border-white/20 hover:border-sky-400/50 hover:bg-white/5"
          }`}
        >
          <input
            type="file"
            accept={ACCEPT}
            multiple
            className="sr-only"
            onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }}
          />
          <span className="block text-sky-100 font-medium">Drop photos here, or click to choose</span>
          <span className="block text-xs text-slate-400 mt-1">
            JPEG, RAW (NEF, DNG, CR2/CR3, ARW, RW2, ORF, RAF, SRW), or HEIC. Max 50 MB per file.
          </span>
        </label>

        {form.files.length > 0 && (
          <div className="mt-4">
            <div className="flex items-center justify-between text-sm text-slate-300 mb-2">
              <span>
                {form.files.length} file{form.files.length === 1 ? "" : "s"} · {formatBytes(totalBytes)}
                {splitIntoBatches(form.files).length > 1 &&
                  ` · uploads in ${splitIntoBatches(form.files).length} batches`}
              </span>
              <button type="button" onClick={() => setForm((f) => ({ ...f, files: [] }))} className="text-slate-400 hover:text-rose-300">
                Clear all
              </button>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {previews.map((url, i) => (
                <div key={url} className="relative h-20 w-28 shrink-0 rounded-md overflow-hidden border border-white/10">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeFile(i)}
                    aria-label={`Remove ${form.files[i]?.name}`}
                    className="absolute top-1 right-1 h-5 w-5 rounded-full bg-slate-900/80 text-xs text-white hover:bg-rose-600"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-6 flex items-center gap-3">
          <button
            type="submit"
            className="rounded-lg bg-sky-600/90 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-40"
            disabled={isSubmitting || !form.files.length}
          >
            {isSubmitting
              ? progress && progress.total > 1
                ? `Uploading batch ${progress.current} of ${progress.total}…`
                : "Uploading…"
              : "Upload set"}
          </button>
          {isSubmitting && progress && (
            <div className="h-1.5 flex-1 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full bg-sky-400 transition-all"
                style={{ width: `${(progress.current / progress.total) * 100}%` }}
              />
            </div>
          )}
        </div>
      </form>

      <h2 className="text-xl font-semibold mb-4 text-sky-100">
        Published sets {photos.length ? <span className="text-slate-500 text-base">({photos.length})</span> : null}
      </h2>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => <div key={i} className="h-64 rounded-xl bg-white/10 animate-pulse" />)}
        </div>
      ) : photos.length === 0 ? (
        <p className="text-slate-400">Nothing published yet.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {photos.map((photo) => {
            const images = groupImages(photo);
            const pending = Number(photo.pending_count || 0);
            return (
              <div key={photo.id} className="rounded-xl border border-white/10 bg-white/10 backdrop-blur-xl overflow-hidden flex flex-col">
                <div className="relative h-40 bg-white/5">
                  {images[0] ? (
                    <Image src={images[0].thumb} alt={photo.title || "Photo"} fill className="object-cover" sizes="320px" unoptimized />
                  ) : (
                    <div className="grid h-full place-items-center text-slate-500 text-sm">Processing…</div>
                  )}
                  <span className="absolute bottom-2 right-2 rounded-full bg-slate-900/70 border border-white/10 px-2 py-0.5 text-[11px] text-sky-100 backdrop-blur">
                    {images.length} image{images.length === 1 ? "" : "s"}
                    {pending > 0 ? ` · ${pending} processing` : ""}
                  </span>
                </div>

                <div className="p-4 flex-1 flex flex-col">
                  {editId === photo.id ? (
                    <form className="space-y-2 flex-1" onSubmit={handleEdit}>
                      <input
                        className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-sky-100 focus:outline-none focus:ring-2 focus:ring-sky-400/50"
                        placeholder="Title"
                        value={editForm.title}
                        onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
                      />
                      <textarea
                        rows={4}
                        className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-sky-100 focus:outline-none focus:ring-2 focus:ring-sky-400/50"
                        placeholder="Caption"
                        value={editForm.caption}
                        onChange={(e) => setEditForm((f) => ({ ...f, caption: e.target.value }))}
                      />
                      <p className="text-[11px] text-slate-500">Applies to all {images.length} photos in this set.</p>
                      <div className="flex gap-2 pt-1">
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
                      <div className="font-semibold text-sky-100 truncate">{photo.title || "Untitled"}</div>
                      <p className="text-slate-400 text-sm line-clamp-2 flex-1 mt-1">{photo.caption || "No caption"}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button onClick={() => startEdit(photo)} className="rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-sm text-sky-100 hover:bg-white/10">
                          Edit
                        </button>
                        <a href={`/photos/${photo.id}`} target="_blank" rel="noreferrer" className="rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-sm text-sky-100 hover:bg-white/10">
                          View
                        </a>
                        <button onClick={() => handleDelete(photo)} className="rounded-lg border border-rose-400/30 bg-rose-500/10 px-3 py-1.5 text-sm text-rose-200 hover:bg-rose-500/20 ml-auto">
                          Delete
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </AdminShell>
  );
}
