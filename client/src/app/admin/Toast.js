"use client";
import { useEffect } from "react";

/**
 * Inline status banner. Replaces the mix of `alert()` calls and error strings
 * that previously left admin actions with no visible confirmation at all.
 */
export default function Toast({ message, tone = "info", onDismiss, autoDismissMs = 4000 }) {
  useEffect(() => {
    if (!message || !onDismiss || tone === "error") return;
    const timer = setTimeout(onDismiss, autoDismissMs);
    return () => clearTimeout(timer);
  }, [message, tone, onDismiss, autoDismissMs]);

  if (!message) return null;

  const tones = {
    info: "border-sky-400/30 bg-sky-500/10 text-sky-100",
    success: "border-emerald-400/30 bg-emerald-500/10 text-emerald-100",
    error: "border-rose-400/40 bg-rose-500/10 text-rose-100",
  };

  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={`mb-6 flex items-start justify-between gap-4 rounded-lg border px-4 py-3 text-sm ${tones[tone] || tones.info}`}
    >
      <span className="whitespace-pre-wrap">{message}</span>
      {onDismiss ? (
        <button onClick={onDismiss} aria-label="Dismiss" className="opacity-60 hover:opacity-100">
          ✕
        </button>
      ) : null}
    </div>
  );
}
