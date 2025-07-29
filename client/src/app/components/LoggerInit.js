"use client";
// Component executes on client to ensure logger side effects run and window.logger is set.
import "../../utils/logger";

export default function LoggerInit() {
  // No UI; side-effect only
  return null;
}
