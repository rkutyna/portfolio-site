"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

const TOKEN_KEY = "admin_jwt";

export const getToken = () =>
  typeof window !== "undefined" ? localStorage.getItem(TOKEN_KEY) : null;

export const clearToken = () => {
  if (typeof window !== "undefined") localStorage.removeItem(TOKEN_KEY);
};

/** Seconds remaining on the JWT, or null if it can't be read. */
export const tokenExpiry = () => {
  const token = getToken();
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.exp ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
};

/**
 * fetch() wrapper for admin calls.
 *
 * The JWT lasts two hours; before this, an expired token surfaced as a generic
 * "Failed to save" with no explanation. Now a 401/403 clears the token and
 * throws a message that says what actually happened.
 */
export async function adminFetch(path, options = {}) {
  const token = getToken();
  const headers = { ...(options.headers || {}), Authorization: `Bearer ${token}` };
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${path}`, { ...options, headers });

  if (res.status === 401 || res.status === 403) {
    clearToken();
    if (typeof window !== "undefined") {
      window.location.href = "/hiddenlogin?expired=1";
    }
    throw new Error("Your session expired. Please log in again.");
  }
  return res;
}

/** Parse an error response body into something worth showing a human. */
export async function errorMessage(res, fallback) {
  try {
    const data = await res.json();
    return data.error || data.message || fallback;
  } catch {
    return fallback;
  }
}

export function useAdminAuth() {
  const [verified, setVerified] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.push("/hiddenlogin");
      return;
    }
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/verify`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) {
          clearToken();
          router.push("/hiddenlogin?expired=1");
        } else {
          setVerified(true);
        }
      })
      .catch(() => {
        router.push("/hiddenlogin");
      });
  }, [router]);

  const logout = useCallback(() => {
    clearToken();
    router.push("/hiddenlogin");
  }, [router]);

  return verified;
}
