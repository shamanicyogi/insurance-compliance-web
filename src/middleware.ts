import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// Define API routes that require subscription protection
const protectedApiRoutes = [
  "/api/user/upload",
  "/api/user/profile-picture",
  "/api/stripe/checkout",
  "/api/stripe/portal",
];

// Check employee status directly using Supabase
async function hasEmployeeRecord(userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from("employees")
      .select("id")
      .eq("user_id", userId)
      .eq("is_active", true)
      .single();

    return !error && !!data;
  } catch (error) {
    console.error("Employee check failed:", error);
    return false; // Safe default - redirect to onboarding
  }
}

export default withAuth(
  async function middleware(req) {
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
    const isSnowRemovalOnboarding = pathname.startsWith(
      "/snow-removal/onboarding"
    );

    // Routes that don't require employee records
    const isPublicRoute = isAuthPage || isSnowRemovalOnboarding;

    // If user is logged in and trying to access login/signup pages
    if (isAuthenticated && isAuthPage) {
      // Check if there are invitation parameters - if so, redirect to onboarding with them
      const invitation =
        req.nextUrl.searchParams.get("invitation") ||
        req.nextUrl.searchParams.get("invitationCode");
      const company = req.nextUrl.searchParams.get("company");
      const inviter = req.nextUrl.searchParams.get("inviter");
      const email = req.nextUrl.searchParams.get("email");

      if (invitation) {
        const onboardingUrl = new URL("/snow-removal/onboarding", req.url);
        onboardingUrl.searchParams.set("invitation", invitation);
        if (company) onboardingUrl.searchParams.set("company", company);
        if (inviter) onboardingUrl.searchParams.set("inviter", inviter);
        if (email) onboardingUrl.searchParams.set("email", email);
        return NextResponse.redirect(onboardingUrl);
      }

      // Otherwise redirect to dashboard
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    // 🎯 EMPLOYEE CHECK FOR ALL AUTHENTICATED ROUTES
    // All authenticated users must have employee records (this is a snow removal company app)
    if (isAuthenticated && !isPublicRoute && token.sub) {
      const hasEmployee = await hasEmployeeRecord(token.sub);

      if (!hasEmployee) {
        const onboardingUrl = new URL("/snow-removal/onboarding", req.url);

        // 🎯 Preserve invitation parameters if they exist
        const invitation =
          req.nextUrl.searchParams.get("invitation") ||
          req.nextUrl.searchParams.get("invitationCode");
        const company = req.nextUrl.searchParams.get("company");
        const inviter = req.nextUrl.searchParams.get("inviter");
        const email = req.nextUrl.searchParams.get("email");

        if (invitation) {
          onboardingUrl.searchParams.set("invitation", invitation);
          if (company) onboardingUrl.searchParams.set("company", company);
          if (inviter) onboardingUrl.searchParams.set("inviter", inviter);
          if (email) onboardingUrl.searchParams.set("email", email);
        }

        return NextResponse.redirect(onboardingUrl);
      }
    }

    // If user has employee record but is on onboarding, redirect to dashboard
    if (isAuthenticated && isSnowRemovalOnboarding && token.sub) {
      const hasEmployee = await hasEmployeeRecord(token.sub);

      if (hasEmployee) {
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const pathname = req.nextUrl.pathname;

        // Allow unauthenticated access to auth and snow removal onboarding pages
        if (
          pathname === "/" ||
          pathname.startsWith("/login") ||
          pathname.startsWith("/signup") ||
          pathname.startsWith("/snow-removal/onboarding")
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
    "/",
    // All app pages require employee records
    "/dashboard/:path*",
    "/profile/:path*",
    "/settings/:path*",
    "/billing/:path*",
    "/ai-coach/:path*",
    "/snow-removal/:path*",
    "/team/:path*",
    "/tasks/:path*",
    "/login",
    "/signup",
    // API routes that need protection
    "/api/user/:path*",
    "/api/stripe/:path*",
  ],
};
