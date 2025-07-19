// This file configures the initialization of Sentry on the client.
// The added config here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Add optional integrations for additional features
  integrations: [
    Sentry.replayIntegration(),
    Sentry.globalHandlersIntegration({
      onunhandledrejection: true,
      onerror: true,
    }),
  ],

  // 🔇 REDUCED: Lower trace sampling for client efficiency
  tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,

  // 🔇 REDUCED: Lower replay sampling to reduce bandwidth
  replaysSessionSampleRate: process.env.NODE_ENV === "development" ? 0.1 : 0.01,

  // 🔇 REDUCED: Keep error replay sampling reasonable
  replaysOnErrorSampleRate: 0.3,

  // 🔇 REDUCED: No debug in production
  debug: false,

  // 🔇 FILTERED: Smart client-side filtering
  beforeSend(event) {
    // Filter out common client-side noise
    if (event.exception) {
      const error = event.exception.values?.[0];
      if (error?.type || error?.value) {
        const skipErrors = [
          "ResizeObserver loop limit exceeded",
          "Non-Error promise rejection captured",
          "ChunkLoadError",
          "Loading chunk",
          "Loading CSS chunk",
          "Script error",
          "Network request failed",
          "Failed to fetch",
          "The request timed out",
          "Unexpected token",
          "SyntaxError: Unexpected token",
          "cancelled",
          "AbortError",
        ];

        const errorText = `${error.type || ""} ${
          error.value || ""
        }`.toLowerCase();
        if (
          skipErrors.some((skipError) =>
            errorText.includes(skipError.toLowerCase())
          )
        ) {
          return null; // Don't send these events
        }
      }
    }

    // Filter out events from browser extensions
    if (event.exception?.values?.[0]?.stacktrace?.frames) {
      const frames = event.exception.values[0].stacktrace.frames;
      const hasExtensionFrame = frames.some(
        (frame) =>
          frame.filename?.includes("extension://") ||
          frame.filename?.includes("moz-extension://")
      );
      if (hasExtensionFrame) {
        return null;
      }
    }

    // 🔇 QUIET: Only log when explicitly debugging
    if (
      process.env.NODE_ENV === "development" &&
      process.env.SENTRY_DEBUG === "true"
    ) {
      console.log(
        "🎯 Client Sentry event:",
        event.exception?.values?.[0]?.type || event.message
      );
    }

    return event;
  },
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
