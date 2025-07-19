import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

// Define API routes that require an active subscription for write operations
const protectedApiRoutes = [
  "/api/user/hydration",
  "/api/user/macros",
  "/api/user/meals",
  "/api/user/metrics",
  "/api/user/progress-photos",
  "/api/user/sleep",
  "/api/user/weight",
  "/api/user/workout",
  "/api/food",
  "/api/programs",
  "/api/exercises",
  "/api/journal",
];

// Production middleware with authentication and onboarding flow
export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const isAuthenticated = !!token;
    const pathname = req.nextUrl.pathname;
    const isModificationMethod = ["POST", "PUT", "PATCH"].includes(req.method);

    // Check for protected API routes
    const isProtectedApiRoute = protectedApiRoutes.some((route) =>
      pathname.startsWith(route)
    );

    if (
      isAuthenticated &&
      isProtectedApiRoute &&
      isModificationMethod &&
      !token?.hasActiveSubscription
    ) {
      // User is trying to modify data on a protected API without a subscription.
      // Return a 403 Forbidden response. This is our server-side "bouncer".
      return new NextResponse(
        JSON.stringify({
          error: "A subscription is required to perform this action.",
        }),
        {
          status: 403,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Define route types
    const isAuthPage =
      pathname.startsWith("/login") || pathname.startsWith("/signup");
    const isOnboardingPage = pathname.startsWith("/onboarding");

    // If user is logged in and trying to access login/signup pages
    if (isAuthenticated && isAuthPage) {
      // Check if they need onboarding first
      if (!token?.onboardingCompleted) {
        return NextResponse.redirect(new URL("/onboarding", req.url));
      }

      // User completed onboarding, send to dashboard
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    // If user is authenticated but hasn't completed onboarding
    // Allow access to /onboarding/finalize even if onboarding isn't completed
    if (
      isAuthenticated &&
      !token?.onboardingCompleted &&
      !isOnboardingPage &&
      !pathname.startsWith("/onboarding/finalize")
    ) {
      return NextResponse.redirect(new URL("/onboarding", req.url));
    }

    // If user completed onboarding but is on onboarding page, redirect to dashboard
    // Exception: allow access to /onboarding/finalize which handles its own logic
    if (
      isAuthenticated &&
      token?.onboardingCompleted &&
      isOnboardingPage &&
      !pathname.startsWith("/onboarding/finalize")
    ) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const pathname = req.nextUrl.pathname;

        // Allow unauthenticated access to auth and onboarding pages
        if (
          pathname.startsWith("/login") ||
          pathname.startsWith("/signup") ||
          pathname.startsWith("/onboarding")
        ) {
          return true;
        }

        // For all other routes, require authentication
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/profile/:path*",
    "/settings/:path*",
    "/billing/:path*",
    "/ai-coach/:path*",
    "/login",
    "/signup",
    "/onboarding/:path*",
    // Add all protected API routes to the matcher
    "/api/user/hydration/:path*",
    "/api/user/macros/:path*",
    "/api/user/meals/:path*",
    "/api/user/metrics/:path*",
    "/api/user/progress-photos/:path*",
    "/api/user/sleep/:path*",
    "/api/user/weight/:path*",
    "/api/user/workout/:path*",
    "/api/food/:path*",
    "/api/programs/:path*",
    "/api/exercises/:path*",
    "/api/journal/:path*",
  ],
};
