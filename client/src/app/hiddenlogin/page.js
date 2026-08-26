"use client";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function LoginForm() {
  const [secret, setSecret] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const params = useSearchParams();
  // Set by adminFetch when a request comes back 401/403, so an expired session
  // explains itself instead of silently bouncing back to a blank login box.
  const expired = params.get("expired") === "1";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          res.status === 429
            ? "Too many attempts. Try again in a few minutes."
            : data.error || "Login failed"
        );
      }
      localStorage.setItem("admin_jwt", data.token);
      router.push("/admin");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center py-24 px-4">
      <form
        className="w-full max-w-sm rounded-2xl border border-white/10 bg-white/10 backdrop-blur-xl p-8 shadow-sm"
        onSubmit={handleSubmit}
      >
        <h1 className="text-2xl font-bold mb-2 text-center text-sky-100">Admin Login</h1>
        <p className="text-center text-slate-400 text-sm mb-6">
          {expired ? "Your session expired. Please log in again." : "Enter your secret key to continue."}
        </p>
        <label htmlFor="secret" className="sr-only">
          Secret key
        </label>
        <input
          id="secret"
          type="password"
          autoComplete="current-password"
          autoFocus
          className="w-full mb-4 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sky-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-400/50"
          placeholder="Secret key"
          value={secret}
          onChange={(e) => setSecret(e.target.value)}
          required
        />
        {error && (
          <div role="alert" className="mb-4 rounded-lg border border-rose-400/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-100">
            {error}
          </div>
        )}
        <button
          type="submit"
          className="w-full rounded-lg bg-sky-600/90 py-2 font-medium text-white hover:bg-sky-500 disabled:opacity-40"
          disabled={loading || !secret}
        >
          {loading ? "Logging in…" : "Log in"}
        </button>
      </form>
    </div>
  );
}

export default function HiddenLoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
