import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

// Check if user has employee record using edge-compatible approach
async function hasEmployeeRecord(userId: string): Promise<boolean> {
  try {
    // Use Supabase REST API directly to avoid client issues in Edge Runtime
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/employees?user_id=eq.${userId}&is_active=eq.true&select=id`,
      {
        headers: {
          apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      console.error("Employee check failed:", response.statusText);
      return false;
    }

    const data = await response.json();
    return data && data.length > 0;
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

    // Define route types
    const isAuthPage =
      pathname.startsWith("/login") || pathname.startsWith("/signup");
    const isOnboarding = pathname.startsWith("/snow-removal/onboarding");
    const isPublicRoute = pathname === "/" || isAuthPage || isOnboarding;

    // If user is logged in and trying to access login/signup pages
    if (isAuthenticated && isAuthPage) {
      // Check for invitation parameters - if so, redirect to onboarding with them
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

      // For authenticated users on auth pages without invitation, check employee status
      if (token.sub) {
        const hasEmployee = await hasEmployeeRecord(token.sub);
        if (hasEmployee) {
          return NextResponse.redirect(new URL("/dashboard", req.url));
        } else {
          return NextResponse.redirect(
            new URL("/snow-removal/onboarding", req.url)
          );
        }
      }
    }

    // 🎯 MAIN LOGIC: Check employee record for all authenticated users on protected routes
    if (isAuthenticated && !isPublicRoute && token.sub) {
      const hasEmployee = await hasEmployeeRecord(token.sub);

      if (!hasEmployee) {
        // User doesn't have employee record - redirect to onboarding
        const onboardingUrl = new URL("/snow-removal/onboarding", req.url);

        // Preserve any invitation parameters
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
    if (isAuthenticated && isOnboarding && token.sub) {
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

        // Allow unauthenticated access to public pages
        if (
          pathname === "/" ||
          pathname.startsWith("/login") ||
          pathname.startsWith("/signup") ||
          pathname.startsWith("/snow-removal/onboarding") ||
          pathname.startsWith("/terms") ||
          pathname.startsWith("/join")
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
    // All app pages that require employee records
    "/dashboard/:path*",
    "/profile/:path*",
    "/settings/:path*",
    "/billing/:path*",
    "/ai-coach/:path*",
    "/snow-removal/:path*",
    "/team/:path*",
    "/tasks/:path*",
    "/sites/:path*",
    "/login",
    "/signup",
    "/join/:path*",
    "/terms",
  ],
};
