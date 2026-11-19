"use client";

import { useEffect } from "react";
import { reportClientError } from "@/lib/report-error";

/** Sends uncaught browser errors to the admin error log. Renders nothing. */
export default function ErrorReporter() {
  useEffect(() => {
    const onError = (e: ErrorEvent) => reportClientError(e.message, [e.filename && `${e.filename}:${e.lineno}:${e.colno}`, e.error?.stack].filter(Boolean).join("\n"));
    const onRejection = (e: PromiseRejectionEvent) => {
      const r = e.reason;
      reportClientError(r instanceof Error ? r.message : String(r), r instanceof Error ? r.stack : undefined);
    };
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);
  return null;
}
