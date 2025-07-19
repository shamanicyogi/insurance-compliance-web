"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // 🔥 ENHANCED ERROR CAPTURE
    console.error("Global Error Boundary caught:", error);

    Sentry.withScope((scope) => {
      scope.setTag("error_boundary", "global");
      scope.setLevel("error");
      scope.setContext("error_details", {
        message: error.message,
        stack: error.stack,
        digest: error.digest,
      });
      Sentry.captureException(error);
    });
  }, [error]);

  return (
    <html>
      <body>
        <div style={{ padding: "20px" }}>
          <h2>Something went wrong!</h2>
          <button onClick={reset}>Try again</button>
          <details style={{ marginTop: "20px" }}>
            <summary>Error details</summary>
            <pre>{error.message}</pre>
          </details>
        </div>
      </body>
    </html>
  );
}
