import type { Viewport, Metadata } from "next";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/components/auth-provider";
import "./globals.css";
import { Providers as QueryProvider } from "@/components/query-provider";
import { GlobalErrorHandler } from "@/components/global-error-handler";

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: "WebApp Starter - Next.js Template",
  description:
    "A complete Next.js starter template with authentication, payments, database, and modern UI components. Build your SaaS faster.",
  manifest: "/manifest.json",
  keywords: [
    "Next.js",
    "React",
    "TypeScript",
    "Tailwind CSS",
    "Starter Template",
    "SaaS",
    "Authentication",
    "Stripe",
    "Supabase",
  ],
  authors: [{ name: "WebApp Starter Team" }],
  creator: "WebApp Starter",
  publisher: "WebApp Starter",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://webappstarter.dev",
    title: "WebApp Starter - Next.js Template",
    description:
      "A complete Next.js starter template with authentication, payments, database, and modern UI components. Build your SaaS faster.",
    siteName: "WebApp Starter",
  },
  twitter: {
    card: "summary_large_image",
    title: "WebApp Starter - Next.js Template",
    description:
      "A complete Next.js starter template with authentication, payments, database, and modern UI components. Build your SaaS faster.",
    creator: "@webappstarter",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "WebApp Starter",
  },
  formatDetection: {
    telephone: false,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      </head>
      <body>
        <QueryProvider>
          <AuthProvider>
            <ThemeProvider
              attribute="class"
              defaultTheme="system"
              enableSystem
              disableTransitionOnChange
            >
              {children}
              <Toaster position="top-right" />
            </ThemeProvider>
          </AuthProvider>
        </QueryProvider>
        <GlobalErrorHandler />
      </body>
    </html>
  );
}
