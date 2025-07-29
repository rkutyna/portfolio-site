"use client";
import { useEffect } from "react";
import logger from "../utils/logger";

export default function NotFound() {
  useEffect(() => {
    logger.warn("404 - page not found", window.location.pathname);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <h1 className="text-3xl font-bold mb-4">404 - Page Not Found</h1>
      <p className="text-lg">The page you are looking for does not exist.</p>
    </div>
  );
}
