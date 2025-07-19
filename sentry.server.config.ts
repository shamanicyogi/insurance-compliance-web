// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

// 🔇 DEVELOPMENT: Disable Sentry completely in development
if (process.env.NODE_ENV === "development") {
  // Don't initialize Sentry in development
  console.log("🔇 Sentry disabled for development");
} else {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,

    // 🔇 REDUCED: Lower trace sampling for production efficiency
    tracesSampleRate: 0.1,

    // 🔇 REDUCED: Only debug in development when explicitly needed
    debug: false,

    // 🔇 FILTERED: Smart filtering to reduce noise
    beforeSend(event) {
      // Filter out common, non-critical errors
      if (event.exception) {
        const error = event.exception.values?.[0];
        if (error?.type) {
          // Skip common browser/network errors that aren't actionable
          const skipErrors = [
            "ResizeObserver loop limit exceeded",
            "Non-Error promise rejection captured",
            "ChunkLoadError",
            "Loading chunk",
            "Loading CSS chunk",
            "NetworkError",
            "Failed to fetch",
          ];

          if (
            skipErrors.some(
              (skipError) =>
                error.type?.includes(skipError) ||
                error.value?.includes(skipError)
            )
          ) {
            return null; // Don't send these events
          }
        }
      }

      // 🔇 QUIET: Only log in development when debugging specific issues
      if (
        process.env.NODE_ENV === "development" &&
        process.env.SENTRY_DEBUG === "true"
      ) {
        console.log(
          "🎯 Sentry event:",
          event.exception?.values?.[0]?.type || event.message
        );
      }

      return event;
    },

    // 🔇 FILTERED: Only capture meaningful performance data
    beforeSendTransaction(event) {
      // Skip very fast transactions that don't provide value
      if (event.start_timestamp && event.timestamp) {
        const duration = event.timestamp - event.start_timestamp;
        if (duration < 0.1) {
          // Skip sub-100ms transactions
          return null;
        }
      }
      return event;
    },
  });
}
