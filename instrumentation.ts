export async function register() {
  // 🔇 DEVELOPMENT: Skip Sentry initialization in development
  if (process.env.NODE_ENV === "development") {
    console.log("🔇 Sentry instrumentation disabled for development");
    return;
  }

  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}
