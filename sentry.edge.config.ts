// This file configures the initialization of Sentry for edge features (middleware, edge routes, and so on).
// The config you add here will be used whenever one of the edge features is loaded.
// Note that this config is unrelated to the Vercel Edge Runtime and is also required when running locally.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

// 🔇 DEVELOPMENT: Disable Sentry completely in development
if (process.env.NODE_ENV === "development") {
  // Don't initialize Sentry in development
  console.log("🔇 Sentry edge disabled for development");
} else {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,

    // 🔇 REDUCED: Lower trace sampling for edge runtime efficiency
    tracesSampleRate: 0.05,

    // 🔇 REDUCED: No debug logging in edge runtime
    debug: false,

    // 🔇 FILTERED: Smart filtering for edge runtime
    beforeSend(event) {
      // Filter out edge-specific noise
      if (event.exception) {
        const error = event.exception.values?.[0];
        if (error?.type) {
          const skipErrors = [
            "NetworkError",
            "AbortError",
            "TimeoutError",
            "Failed to fetch",
          ];

          if (
            skipErrors.some(
              (skipError) =>
                error.type?.includes(skipError) ||
                error.value?.includes(skipError)
            )
          ) {
            return null;
          }
        }
      }

      // 🔇 QUIET: No console logs in edge runtime
      return event;
    },
  });
}
