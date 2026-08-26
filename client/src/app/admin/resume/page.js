"use client";
import { useEffect, useState } from "react";
import { useAdminAuth, getToken } from "../useAdminAuth";
import AdminShell from "../AdminShell";

export default function AdminResume() {
  const verified = useAdminAuth();
  const [file, setFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [hasResume, setHasResume] = useState(null);


  useEffect(() => {
    if (!verified) return;
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/resume`, { method: "HEAD" })
      .then(res => setHasResume(res.ok))
      .catch(() => setHasResume(false));
  }, [verified]);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return;
    setIsSubmitting(true);
    setError("");
    setSuccess("");

    const formData = new FormData();
    formData.append("resume", file);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/resume`, {
        method: "POST",
        headers: { Authorization: `Bearer ${getToken()}` },
        body: formData,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Upload failed");
      }
      setSuccess("Resume uploaded successfully. It is now live at /resume.");
      setHasResume(true);
      setFile(null);
      // Reset file input
      e.target.reset();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!verified) return null;

  return (
    <AdminShell title="Resume" description="Upload a PDF to replace the published resume.">

      {hasResume !== null && (
        <div className={`mb-6 text-sm px-4 py-3 rounded-lg border ${hasResume ? "bg-emerald-500/10 border-emerald-400/20 text-emerald-300" : "bg-amber-500/10 border-amber-400/20 text-amber-300"}`}>
          {hasResume
            ? <>A resume is currently live. Uploading a new one will replace it. <a href="/resume" target="_blank" className="underline hover:text-emerald-200">View current →</a></>
            : "No resume is uploaded yet. Upload a PDF to make it live."}
        </div>
      )}

      <form
        className="bg-white/10 backdrop-blur-xl border border-white/10 rounded-xl p-6 shadow-sm"
        onSubmit={handleUpload}
      >
        <h2 className="text-xl font-semibold mb-4 text-sky-100">Upload New Resume</h2>
        <div className="mb-4">
          <label className="block text-sm text-slate-300 mb-1">PDF file (max 20 MB)</label>
          <input
            type="file"
            accept="application/pdf,.pdf"
            required
            className="w-full text-slate-200 file:mr-4 file:py-2 file:px-3 file:rounded file:border-0 file:bg-sky-700/70 file:text-white hover:file:bg-sky-600/70"
            onChange={e => setFile(e.target.files?.[0] || null)}
          />
        </div>
        {file && (
          <p className="text-sm text-slate-400 mb-4">{file.name} — {(file.size / 1024 / 1024).toFixed(2)} MB</p>
        )}
        {error && <p className="text-red-400 mb-3 text-sm">{error}</p>}
        {success && <p className="text-emerald-400 mb-3 text-sm">{success}</p>}
        <button
          type="submit"
          disabled={isSubmitting || !file}
          className="bg-sky-600/80 text-white px-4 py-2 rounded border border-white/10 hover:bg-sky-500/80 disabled:opacity-50"
        >
          {isSubmitting ? "Uploading..." : "Upload Resume"}
        </button>
      </form>
    </AdminShell>
  );
}
