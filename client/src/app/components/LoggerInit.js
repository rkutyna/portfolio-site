"use client";
import { useEffect } from "react";
import logger from "../../utils/logger";

export default function LoggerInit() {
  useEffect(() => {
    const handle = () => {
      logger.info("pageview", window.location.pathname + window.location.search);
    };
    // initial
    handle();
    // listen to popstate
    window.addEventListener("popstate", handle);
    return () => window.removeEventListener("popstate", handle);
  }, []);
  return null;
}
