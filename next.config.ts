import path from "path";
import { Configuration } from "webpack";
// @ts-expect-error - next-pwa doesn't have TypeScript declarations
import nextPWA from "next-pwa";
import { withSentryConfig } from "@sentry/nextjs";

const withPWA = nextPWA({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
});

// TODO npm install --save-dev @types/webpack

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // 🖼️ Image optimization configuration
  images: {
    domains: [
      "hdlewvtgnzqjybqjnffa.supabase.co",
      "d3rm7f2fy3hn6r.cloudfront.net",
      "workout-media.s3.ca-central-1.amazonaws.com",
    ],
  },

  // 🚀 Experimental: Set server action body size limit
  // experimental: {
  //   serverActions: {
  //     bodySizeLimit: "10mb", // Increase server action body limit
  //   },
  // },

  // 🔒 SECURITY: Security headers
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // Prevent embedding in iframes (clickjacking protection)
          { key: "X-Frame-Options", value: "DENY" },
          // Prevent MIME type sniffing
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Enable XSS protection
          { key: "X-XSS-Protection", value: "1; mode=block" },
          // Prevent DNS prefetching
          { key: "X-DNS-Prefetch-Control", value: "off" },
          // Referrer policy
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Permissions policy
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          // Content Security Policy - RESTORED WITH PROPER S3 DOMAINS
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.sentry-cdn.com https://js.stripe.com",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https: blob:",
              "font-src 'self' data:",
              "connect-src 'self' https://api.openai.com https://api.edamam.com https://*.supabase.co wss://*.supabase.co https://*.sentry.io https://*.s3.amazonaws.com https://workout-media.s3.ca-central-1.amazonaws.com https://d3rm7f2fy3hn6r.cloudfront.net workout-media.s3.ca-central-1.amazonaws.com https://api.stripe.com https://smtp.resend.com https://api.resend.com https://maps.googleapis.com https://nominatim.openstreetmap.org https://api.openweathermap.org",
              "media-src 'self' blob: data: https:",
              "worker-src 'self' blob:",
              "frame-src 'self' https://js.stripe.com", // This is the new line for iframes
              "child-src 'self'",
              "form-action 'self'",
              "base-uri 'self'",
              "manifest-src 'self'",
            ].join("; "),
          },
        ],
      },
      {
        source: "/api/(.*)",
        headers: [
          // 🔒 SECURITY: Dynamic CORS configuration using environment variables
          {
            key: "Access-Control-Allow-Origin",
            value:
              process.env.NODE_ENV === "production"
                ? process.env.CORS_ORIGIN || "https://slipcheck.pro"
                : "http://localhost:3000",
          },
          {
            key: "Access-Control-Allow-Methods",
            value: "GET, POST, PUT, DELETE, OPTIONS",
          },
          {
            key: "Access-Control-Allow-Headers",
            value: "Content-Type, Authorization",
          },
          { key: "Access-Control-Max-Age", value: "86400" },
        ],
      },
    ];
  },

  webpack: (config: Configuration) => {
    config.resolve!.alias = {
      ...config.resolve!.alias,
      // Add our shim as alias for the package
      "react-use-effect-event": path.resolve(
        "./src/lib/shims/useEffectEvent.js"
      ),
      "@radix-ui/react-use-effect-event": path.resolve(
        "./src/lib/shims/useEffectEvent.js"
      ),
    };
    return config;
  },
};

// Apply both PWA and Sentry configs
const configWithPWA = withPWA(nextConfig);

export default withSentryConfig(configWithPWA, {
  // For all available options, see:
  // https://www.npmjs.com/package/@sentry/webpack-plugin#options

  org: "precision-tp",
  project: "precision",

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // Disable source map uploads if no auth token is available
  sourcemaps: {
    disable: !process.env.SENTRY_AUTH_TOKEN,
  },

  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
  // This can increase your server load as well as your hosting bill.
  // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
  // side errors will fail.
  tunnelRoute: "/monitoring",

  // Automatically tree-shake Sentry logger statements to reduce bundle size
  disableLogger: true,

  // Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
  // See the following for more information:
  // https://docs.sentry.io/product/crons/
  // https://vercel.com/docs/cron-jobs
  automaticVercelMonitors: true,
});
