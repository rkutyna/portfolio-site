"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminDashboard() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ title: "", description: "", project_url: "", image: null });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState({ title: "", description: "", project_url: "", image: null });
  const router = useRouter();

  // Helper: Get JWT
  const getToken = () => typeof window !== "undefined" ? localStorage.getItem("admin_jwt") : null;

  // Fetch all projects
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
    // Redirect if not logged in
    if (!getToken()) router.push("/hiddenlogin");
    fetchProjects();
    // eslint-disable-next-line
  }, []);

  // Handle create project
  const handleCreate = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");
    const formData = new FormData();
    formData.append("title", form.title);
    formData.append("description", form.description);
    formData.append("project_url", form.project_url);
    if (form.image) formData.append("image", form.image);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/projects`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${getToken()}`
        },
        body: formData,
      });
      if (!res.ok) throw new Error("Failed to create project");
      setForm({ title: "", description: "", project_url: "", image: null });
      fetchProjects();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle delete
  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this project?")) return;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/projects/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${getToken()}`
        },
      });
      if (!res.ok) throw new Error("Failed to delete project");
      fetchProjects();
    } catch (err) {
      setError(err.message);
    }
  };

  // Handle start edit
  const startEdit = (project) => {
    setEditId(project.id);
    setEditForm({
      title: project.title,
      description: project.description,
      project_url: project.project_url || "",
      image: null,
    });
  };

  // Handle edit submit
  const handleEdit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");
    const body = {
      title: editForm.title,
      description: editForm.description,
      project_url: editForm.project_url,
    };
    // Only send image_url if provided (edit doesn't support image upload in this UI)
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/projects/${editId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`
        },
        body: JSON.stringify(body),
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

  // UI
  return (
    <div className="max-w-3xl mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8 text-center">Admin Dashboard</h1>
      {/* Create Project Form */}
      <form className="bg-white p-6 rounded shadow mb-8" onSubmit={handleCreate}>
        <h2 className="text-xl font-semibold mb-4">Create New Project</h2>
        <div className="mb-4">
          <input
            className="w-full px-3 py-2 border rounded"
            placeholder="Title"
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            required
          />
        </div>
        <div className="mb-4">
          <textarea
            className="w-full px-3 py-2 border rounded"
            placeholder="Description"
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            required
          />
        </div>
        <div className="mb-4">
          <input
            className="w-full px-3 py-2 border rounded"
            placeholder="Project URL (optional)"
            value={form.project_url}
            onChange={e => setForm(f => ({ ...f, project_url: e.target.value }))}
          />
        </div>
        <div className="mb-4">
          <input
            type="file"
            accept="image/*"
            className="w-full"
            onChange={e => setForm(f => ({ ...f, image: e.target.files[0] }))}
            required
          />
        </div>
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Creating..." : "Create Project"}
        </button>
      </form>

      {/* Error Message */}
      {error && <div className="text-red-500 mb-4 text-center">{error}</div>}

      {/* Projects List */}
      <div className="bg-white p-6 rounded shadow">
        <h2 className="text-xl font-semibold mb-4">All Projects</h2>
        {loading ? (
          <div>Loading...</div>
        ) : (
          <ul>
            {projects.map(project => (
              <li key={project.id} className="mb-6 border-b pb-4">
                {editId === project.id ? (
                  <form className="space-y-2" onSubmit={handleEdit}>
                    <input
                      className="w-full px-3 py-2 border rounded"
                      value={editForm.title}
                      onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))}
                      required
                    />
                    <textarea
                      className="w-full px-3 py-2 border rounded"
                      value={editForm.description}
                      onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                      required
                    />
                    <input
                      className="w-full px-3 py-2 border rounded"
                      value={editForm.project_url}
                      onChange={e => setEditForm(f => ({ ...f, project_url: e.target.value }))}
                    />
                    <div className="flex gap-2">
                      <button type="submit" className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700" disabled={isSubmitting}>Save</button>
                      <button type="button" className="bg-gray-300 px-3 py-1 rounded" onClick={() => setEditId(null)}>Cancel</button>
                    </div>
                  </form>
                ) : (
                  <div>
                    <div className="font-bold text-lg">{project.title}</div>
                    <div className="text-gray-700 mb-2">{project.description}</div>
                    {project.project_url && (
                      <a href={project.project_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">View Project</a>
                    )}
                    <div className="flex gap-2 mt-2">
                      <button className="bg-yellow-500 text-white px-3 py-1 rounded hover:bg-yellow-600" onClick={() => startEdit(project)}>Edit</button>
                      <button className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700" onClick={() => handleDelete(project.id)}>Delete</button>
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
