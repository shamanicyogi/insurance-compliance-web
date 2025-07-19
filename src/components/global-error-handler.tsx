"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

export function GlobalErrorHandler() {
  useEffect(() => {
    // 🔥 CATCH ALL UNHANDLED ERRORS
    const handleError = (event: ErrorEvent) => {
      console.error("Unhandled error:", event.error);
      Sentry.captureException(event.error);
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error("Unhandled promise rejection:", event.reason);
      Sentry.captureException(event.reason);
    };

    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleUnhandledRejection);

    return () => {
      window.removeEventListener("error", handleError);
      window.removeEventListener(
        "unhandledrejection",
        handleUnhandledRejection
      );
    };
  }, []);

  return null;
}
