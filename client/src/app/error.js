"use client";
import { useEffect } from "react";
import logger from "../utils/logger";

export default function GlobalError({ error, reset }) {
  useEffect(() => {
    logger.error(error);
  }, [error]);

  return (
    <html>
      <body className="flex flex-col items-center justify-center h-screen">
        <h1 className="text-3xl font-bold mb-4">Something went wrong</h1>
        <pre className="mb-4 whitespace-pre-wrap text-red-600">
          {error?.message}
        </pre>
        <button
          className="px-4 py-2 bg-blue-600 text-white rounded"
          onClick={() => reset()}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
