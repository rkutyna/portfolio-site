"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import Carousel from "../../components/Carousel";
import { useAdminAuth, getToken } from "../useAdminAuth";
import AdminShell from "../AdminShell";

export default function AdminProjects() {
  const verified = useAdminAuth();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ title: "", description: "", project_url: "", images: [], video: null });
  const [previewUrls, setPreviewUrls] = useState([]);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [videoUploadProgress, setVideoUploadProgress] = useState(null); // { current, total, stage }
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState({ title: "", description: "", project_url: "" });


  const fetchProjects = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/projects`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch projects");
      setProjects(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (verified) fetchProjects();
  }, [verified]);

  useEffect(() => {
    if (!form.images || form.images.length === 0) {
      setPreviewUrls([]);
    } else {
      const urls = form.images.map((file) => URL.createObjectURL(file));
      setPreviewUrls(urls);
      return () => urls.forEach((url) => URL.revokeObjectURL(url));
    }
  }, [form.images]);

  useEffect(() => {
    if (!form.video) {
      setVideoPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(form.video);
    setVideoPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [form.video]);

  const CHUNK_SIZE = 50 * 1024 * 1024; // 50 MB — safely under Cloudflare's 100 MB limit

  const uploadVideoInChunks = async (videoFile) => {
    const uploadId = crypto.randomUUID();
    const totalChunks = Math.ceil(videoFile.size / CHUNK_SIZE);

    for (let i = 0; i < totalChunks; i++) {
      setVideoUploadProgress({ current: i + 1, total: totalChunks, stage: "uploading" });
      const start = i * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, videoFile.size);
      const chunk = videoFile.slice(start, end);

      const chunkForm = new FormData();
      chunkForm.append("uploadId", uploadId);
      chunkForm.append("chunkIndex", String(i));
      chunkForm.append("totalChunks", String(totalChunks));
      chunkForm.append("chunk", chunk, `chunk-${i}`);

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/upload/video/chunk`, {
        method: "POST",
        headers: { Authorization: `Bearer ${getToken()}` },
        body: chunkForm,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Failed to upload chunk ${i + 1} of ${totalChunks}`);
      }
    }

    setVideoUploadProgress({ current: totalChunks, total: totalChunks, stage: "assembling" });
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/upload/video/assemble`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getToken()}`,
      },
      body: JSON.stringify({ uploadId, originalFilename: videoFile.name, totalChunks }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "Failed to assemble video");
    }
    const { url } = await res.json();
    return url;
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");
    setVideoUploadProgress(null);
    try {
      let preUploadedVideoUrl = null;
      if (form.video) {
        preUploadedVideoUrl = await uploadVideoInChunks(form.video);
      }

      setVideoUploadProgress(null);
      const formData = new FormData();
      formData.append("title", form.title);
      formData.append("description", form.description);
      formData.append("project_url", form.project_url);
      if (form.images && form.images.length) {
        form.images.forEach(file => formData.append("images", file));
      }
      if (preUploadedVideoUrl) {
        formData.append("video_url", preUploadedVideoUrl);
      }
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/projects`, {
        method: "POST",
        headers: { Authorization: `Bearer ${getToken()}` },
        body: formData,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to create project");
      }
      setForm({ title: "", description: "", project_url: "", images: [], video: null });
      fetchProjects();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
      setVideoUploadProgress(null);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this project?")) return;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/projects/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error("Failed to delete project");
      fetchProjects();
    } catch (err) {
      setError(err.message);
    }
  };

  const startEdit = (project) => {
    setEditId(project.id);
    setEditForm({
      title: project.title,
      description: project.description,
      project_url: project.project_url || "",
    });
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/projects/${editId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          title: editForm.title,
          description: editForm.description,
          project_url: editForm.project_url,
        }),
      });
      if (!res.ok) throw new Error("Failed to update project");
      setEditId(null);
      fetchProjects();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!verified) return null;

  return (
    <AdminShell title="Projects" description="Portfolio projects, with images and an optional video.">

      {/* Create Project Form */}
      <form className="bg-white/10 backdrop-blur-xl border border-white/10 rounded-xl p-6 shadow-sm mb-8" onSubmit={handleCreate}>
        <h2 className="text-xl font-semibold mb-4 text-sky-100">Create New Project</h2>
        <div className="mb-4">
          <input
            className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-sky-100 placeholder-slate-300/70 focus:outline-none focus:ring-2 focus:ring-sky-400/50"
            placeholder="Title"
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            required
          />
        </div>
        <div className="mb-4">
          <textarea
            className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-sky-100 placeholder-slate-300/70 focus:outline-none focus:ring-2 focus:ring-sky-400/50"
            placeholder="Description (Markdown supported)"
            rows={5}
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            required
          />
        </div>
        <div className="mb-4">
          <input
            className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-sky-100 placeholder-slate-300/70 focus:outline-none focus:ring-2 focus:ring-sky-400/50"
            placeholder="Project URL (optional)"
            value={form.project_url}
            onChange={e => setForm(f => ({ ...f, project_url: e.target.value }))}
          />
        </div>
        <div className="mb-4">
          <label className="block text-sm text-slate-300 mb-1">Images (JPEG, up to 10)</label>
          <input
            type="file"
            accept="image/jpeg,image/jpg,.jpg,.jpeg"
            multiple
            className="w-full text-slate-200 file:mr-4 file:py-2 file:px-3 file:rounded file:border-0 file:bg-sky-700/70 file:text-white hover:file:bg-sky-600/70"
            onChange={e => setForm(f => ({ ...f, images: Array.from(e.target.files || []) }))}
            required
          />
        </div>
        {previewUrls.length > 0 && (
          <div className="mb-4">
            <Carousel images={previewUrls} alt="Project image previews" heightClass="h-60" />
          </div>
        )}
        <div className="mb-4">
          <label className="block text-sm text-slate-300 mb-1">Video (MP4, WebM, MOV — optional)</label>
          <input
            type="file"
            accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov,.avi,.mkv"
            className="w-full text-slate-200 file:mr-4 file:py-2 file:px-3 file:rounded file:border-0 file:bg-violet-700/70 file:text-white hover:file:bg-violet-600/70"
            onChange={e => setForm(f => ({ ...f, video: e.target.files?.[0] || null }))}
          />
          <p className="text-xs text-slate-400 mt-1">Max 500 MB. One video per project.</p>
        </div>
        {videoPreviewUrl && (
          <div className="mb-4 rounded overflow-hidden border border-white/10">
            <video src={videoPreviewUrl} controls className="w-full max-h-64 bg-black" />
          </div>
        )}
        <button
          type="submit"
          className="bg-sky-600/80 text-white px-4 py-2 rounded border border-white/10 hover:bg-sky-500/80"
          disabled={isSubmitting}
        >
          {isSubmitting
            ? videoUploadProgress
              ? videoUploadProgress.stage === "assembling"
                ? "Assembling video..."
                : `Uploading video (${videoUploadProgress.current}/${videoUploadProgress.total})...`
              : "Creating..."
            : "Create Project"}
        </button>
      </form>

      {error && <div className="text-red-400 mb-4 text-center">{error}</div>}

      {/* Projects List */}
      <div className="bg-white/10 backdrop-blur-xl border border-white/10 rounded-xl p-6 shadow-sm">
        <h2 className="text-xl font-semibold mb-4 text-sky-100">All Projects</h2>
        {loading ? (
          <div>Loading...</div>
        ) : projects.length === 0 ? (
          <div className="text-slate-400">No projects yet.</div>
        ) : (
          <ul>
            {projects.map(project => (
              <li key={project.id} className="mb-6 border-b border-white/10 pb-4">
                {editId === project.id ? (
                  <form className="space-y-2" onSubmit={handleEdit}>
                    <input
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-sky-100 placeholder-slate-300/70 focus:outline-none focus:ring-2 focus:ring-sky-400/50"
                      value={editForm.title}
                      onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))}
                      required
                    />
                    <textarea
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-sky-100 placeholder-slate-300/70 focus:outline-none focus:ring-2 focus:ring-sky-400/50"
                      rows={4}
                      value={editForm.description}
                      onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                      required
                    />
                    <input
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-sky-100 placeholder-slate-300/70 focus:outline-none focus:ring-2 focus:ring-sky-400/50"
                      placeholder="Project URL"
                      value={editForm.project_url}
                      onChange={e => setEditForm(f => ({ ...f, project_url: e.target.value }))}
                    />
                    <div className="flex gap-2">
                      <button type="submit" className="bg-emerald-600/80 text-white px-3 py-1 rounded border border-white/10 hover:bg-emerald-500/80" disabled={isSubmitting}>Save</button>
                      <button type="button" className="bg-white/10 text-sky-100 px-3 py-1 rounded border border-white/20 hover:bg-white/15" onClick={() => setEditId(null)}>Cancel</button>
                    </div>
                  </form>
                ) : (
                  <div>
                    <div className="font-bold text-lg text-sky-100">{project.title}</div>
                    <div className="text-slate-300 mb-1 line-clamp-2 text-sm">{project.description}</div>
                    {project.video_url && (
                      <span className="inline-block text-xs text-violet-300 bg-violet-500/20 border border-violet-400/20 rounded px-2 py-0.5 mb-1">Has video</span>
                    )}
                    {project.project_url && (
                      <div>
                        <a href={project.project_url} target="_blank" rel="noopener noreferrer" className="text-sky-300 hover:text-sky-200 underline text-sm">View Project</a>
                      </div>
                    )}
                    <div className="flex gap-2 mt-2">
                      <button className="bg-amber-500/80 text-white px-3 py-1 rounded border border-white/10 hover:bg-amber-400/80 text-sm" onClick={() => startEdit(project)}>Edit</button>
                      <button className="bg-rose-600/80 text-white px-3 py-1 rounded border border-white/10 hover:bg-rose-500/80 text-sm" onClick={() => handleDelete(project.id)}>Delete</button>
                      <Link href={`/projects/${project.id}`} className="px-3 py-1 rounded border border-white/10 bg-white/10 text-sky-100 hover:bg-white/15 text-sm">View</Link>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </AdminShell>
  );
}
