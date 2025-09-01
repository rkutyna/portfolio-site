"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminPhotosPage() {
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ title: "", caption: "", file: null });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState({ title: "", caption: "" });
  const router = useRouter();

  const getToken = () => typeof window !== "undefined" ? localStorage.getItem("admin_jwt") : null;

  const fetchPhotos = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/photos`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch photos");
      setPhotos(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!getToken()) router.push("/hiddenlogin");
    fetchPhotos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    if (!form.file) {
      setError("Please select a photo file");
      setIsSubmitting(false);
      return;
    }

    const formData = new FormData();
    if (form.title) formData.append("title", form.title);
    if (form.caption) formData.append("caption", form.caption);
    formData.append("photo", form.file);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/photos`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${getToken()}`
        },
        body: formData,
      });
      if (!res.ok) throw new Error("Failed to upload photo");
      setForm({ title: "", caption: "", file: null });
      fetchPhotos();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this photo?")) return;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/photos/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${getToken()}`
        },
      });
      if (!res.ok) throw new Error("Failed to delete photo");
      fetchPhotos();
    } catch (err) {
      setError(err.message);
    }
  };

  const startEdit = (photo) => {
    setEditId(photo.id);
    setEditForm({
      title: photo.title || "",
      caption: photo.caption || "",
    });
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");
    const body = { title: editForm.title || null, caption: editForm.caption || null };
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/photos/${editId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed to update photo");
      setEditId(null);
      fetchPhotos();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-8 text-sky-100">
      <h1 className="text-3xl font-bold mb-8 text-center text-sky-100">Admin Photos</h1>

      <form className="bg-white/10 backdrop-blur-xl border border-white/10 rounded-xl p-6 shadow-sm mb-8" onSubmit={handleCreate}>
        <h2 className="text-xl font-semibold mb-4 text-sky-100">Upload New Photo</h2>
        <div className="mb-4">
          <input
            className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-sky-100 placeholder-slate-300/70 focus:outline-none focus:ring-2 focus:ring-sky-400/50"
            placeholder="Title (optional)"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          />
        </div>
        <div className="mb-4">
          <textarea
            className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-sky-100 placeholder-slate-300/70 focus:outline-none focus:ring-2 focus:ring-sky-400/50"
            placeholder="Caption (optional)"
            value={form.caption}
            onChange={(e) => setForm((f) => ({ ...f, caption: e.target.value }))}
          />
        </div>
        <div className="mb-4">
          <input
            type="file"
            accept=".heic,.heif,.nef,.dng,.cr2,.cr3,.arw,.rw2,.orf,.raf,.srw,image/*"
            className="w-full text-slate-200 file:mr-4 file:py-2 file:px-3 file:rounded file:border-0 file:bg-sky-700/70 file:text-white hover:file:bg-sky-600/70"
            onChange={(e) => setForm((f) => ({ ...f, file: e.target.files?.[0] || null }))}
            required
          />
          <p className="text-xs text-slate-400 mt-1">Upload HEIC/HEIF, RAW (.NEF, .DNG, .CR2/.CR3, .ARW, etc.), or JPEG/PNG. RAW and HEIC will be converted to JPEG and the original will be discarded.</p>
        </div>
        <button
          type="submit"
          className="bg-sky-600/80 text-white px-4 py-2 rounded border border-white/10 hover:bg-sky-500/80"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Uploading..." : "Upload Photo"}
        </button>
      </form>

      {error && <div className="text-red-500 mb-4 text-center">{error}</div>}

      <div className="bg-white/10 backdrop-blur-xl border border-white/10 rounded-xl p-6 shadow-sm">
        <h2 className="text-xl font-semibold mb-4 text-sky-100">All Photos</h2>
        {loading ? (
          <div>Loading...</div>
        ) : (
          <ul>
            {photos.map((photo) => (
              <li key={photo.id} className="mb-6 border-b border-white/10 pb-4">
                {editId === photo.id ? (
                  <form className="space-y-2" onSubmit={handleEdit}>
                    <input
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-sky-100 placeholder-slate-300/70 focus:outline-none focus:ring-2 focus:ring-sky-400/50"
                      placeholder="Title"
                      value={editForm.title}
                      onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
                    />
                    <textarea
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-sky-100 placeholder-slate-300/70 focus:outline-none focus:ring-2 focus:ring-sky-400/50"
                      placeholder="Caption"
                      value={editForm.caption}
                      onChange={(e) => setEditForm((f) => ({ ...f, caption: e.target.value }))}
                    />
                    <div className="flex gap-2">
                      <button type="submit" className="bg-emerald-600/80 text-white px-3 py-1 rounded border border-white/10 hover:bg-emerald-500/80" disabled={isSubmitting}>Save</button>
                      <button type="button" className="bg-white/10 text-sky-100 px-3 py-1 rounded border border-white/20 hover:bg-white/15" onClick={() => setEditId(null)}>Cancel</button>
                    </div>
                  </form>
                ) : (
                  <div className="flex gap-4">
                    <img src={photo.image_url} alt={photo.title || 'Photo'} className="w-24 h-24 object-cover rounded border border-white/10" />
                    <div className="flex-1">
                      <div className="font-bold text-lg text-sky-100">{photo.title || 'Untitled'}</div>
                      <div className="text-slate-300 mb-2 line-clamp-2">{photo.caption || ''}</div>
                      <div className="flex gap-2 mt-2">
                        <button className="bg-amber-500/80 text-white px-3 py-1 rounded border border-white/10 hover:bg-amber-400/80" onClick={() => startEdit(photo)}>Edit</button>
                        <button className="bg-rose-600/80 text-white px-3 py-1 rounded border border-white/10 hover:bg-rose-500/80" onClick={() => handleDelete(photo.id)}>Delete</button>
                        <a href={`/photos/${photo.id}`} className="px-3 py-1 rounded border border-white/10 bg-white/10 text-sky-100 hover:bg-white/15">View</a>
                      </div>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
