"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { clearToken, tokenExpiry } from "./useAdminAuth";

const NAV = [
  { href: "/admin", label: "Overview", icon: "📊", exact: true },
  { href: "/admin/content", label: "Site Text", icon: "📝" },
  { href: "/admin/projects", label: "Projects", icon: "🗂️" },
  { href: "/admin/blog", label: "Blog Posts", icon: "✍️" },
  { href: "/admin/photos", label: "Photos", icon: "📷" },
  { href: "/admin/resume", label: "Resume", icon: "📄" },
];

/** Live countdown so an expiring session is visible before it bites. */
function SessionBadge() {
  const [remaining, setRemaining] = useState(null);

  useEffect(() => {
    const tick = () => {
      const exp = tokenExpiry();
      setRemaining(exp ? Math.max(0, exp - Date.now()) : null);
    };
    tick();
    const timer = setInterval(tick, 30000);
    return () => clearInterval(timer);
  }, []);

  if (remaining === null) return null;
  const minutes = Math.floor(remaining / 60000);
  const low = minutes < 15;

  return (
    <span
      title="Time left on this admin session"
      className={`text-xs rounded-full px-2.5 py-1 border ${
        low
          ? "border-amber-400/40 bg-amber-400/10 text-amber-200"
          : "border-white/10 bg-white/5 text-slate-400"
      }`}
    >
      {minutes > 0 ? `Session: ${minutes}m` : "Session expiring"}
    </span>
  );
}

/**
 * Chrome shared by every admin page: navigation that does not require going
 * back to a hub, the session countdown, and a single logout control.
 */
export default function AdminShell({ children, title, description, actions }) {
  const pathname = usePathname();
  const router = useRouter();

  const logout = () => {
    clearToken();
    router.push("/hiddenlogin");
  };

  const isActive = (item) =>
    item.exact ? pathname === item.href : pathname.startsWith(item.href);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 text-sky-100">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <Link href="/" className="text-slate-400 hover:text-sky-300 text-sm">
          ← Back to site
        </Link>
        <div className="flex items-center gap-3">
          <SessionBadge />
          <button
            onClick={logout}
            className="text-xs rounded-full border border-rose-400/30 bg-rose-500/10 px-3 py-1 text-rose-200 hover:bg-rose-500/20"
          >
            Log out
          </button>
        </div>
      </div>

      <nav className="mb-8 flex flex-wrap gap-2" aria-label="Admin sections">
        {NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive(item) ? "page" : undefined}
            className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${
              isActive(item)
                ? "border-sky-400/50 bg-sky-500/15 text-sky-100"
                : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-sky-100"
            }`}
          >
            <span aria-hidden>{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>

      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-sky-100">{title}</h1>
          {description ? <p className="text-slate-400 text-sm mt-1">{description}</p> : null}
        </div>
        {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
      </header>

      {children}
    </div>
  );
}
