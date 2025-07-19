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
  title: "SlipCheck - Insurance Compliance & Employee Monitoring",
  description:
    "Insurance compliance and employee monitoring software that makes life easier for both employees and employers. Ensure jobs are insurance compliant with automated reporting.",
  manifest: "/manifest.json",
  keywords: [
    "Insurance Compliance",
    "Employee Monitoring",
    "Risk Management",
    "Compliance Software",
    "Employee Tracking",
    "Insurance Claims",
    "Business Compliance",
    "Automated Reporting",
    "SlipCheck",
  ],
  authors: [{ name: "SlipCheck Team" }],
  creator: "SlipCheck",
  publisher: "SlipCheck",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://slipcheck.pro",
    title: "SlipCheck - Insurance Compliance & Employee Monitoring",
    description:
      "Insurance compliance and employee monitoring software that makes life easier for both employees and employers. Ensure jobs are insurance compliant with automated reporting.",
    siteName: "SlipCheck",
  },
  twitter: {
    card: "summary_large_image",
    title: "SlipCheck - Insurance Compliance & Employee Monitoring",
    description:
      "Insurance compliance and employee monitoring software that makes life easier for both employees and employers. Ensure jobs are insurance compliant with automated reporting.",
    creator: "@slipcheck",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "SlipCheck",
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
