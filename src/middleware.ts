import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

// Check if user has employee record using edge-compatible approach
async function hasEmployeeRecord(userId: string): Promise<boolean> {
  try {
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
      console.error(
        "Employee check failed:",
        response.status,
        response.statusText
      );
      return false;
    }

    const data = await response.json();
    const hasEmployee = data && data.length > 0;

    console.log(`User ${userId} has employee record: ${hasEmployee}`);
    return hasEmployee;
  } catch (error) {
    console.error("Employee check error:", error);
    return false; // Safe default - redirect to onboarding
  }
}

export default withAuth(
  async function middleware(req) {
    const token = req.nextauth.token;
    const pathname = req.nextUrl.pathname;

    console.log(
      `🛣️ Middleware: ${pathname}, Token: ${token}, User: ${token?.sub || "none"}`
    );

    // Skip employee check for these routes
    const skipEmployeeCheck =
      pathname === "/" ||
      pathname.startsWith("/login") ||
      pathname.startsWith("/signup") ||
      pathname.startsWith("/snow-removal/onboarding") ||
      pathname.startsWith("/terms") ||
      pathname.startsWith("/api/auth");

    // MAYBE TOKEN DEOSN"T HAVE!
    console.log(token, "token");

    // 🎯 MAIN LOGIC: If user is authenticated and on a protected route, check employee record
    if (token?.sub && !skipEmployeeCheck) {
      console.log("🔍 Checking employee record...");

      const hasEmployee = await hasEmployeeRecord(token.sub);

      if (!hasEmployee) {
        console.log("🏢 No employee record found - redirecting to onboarding");
        return NextResponse.redirect(
          new URL("/snow-removal/onboarding", req.url)
        );
      }

      console.log("✅ Employee record found - continuing");
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const pathname = req.nextUrl.pathname;

        // Allow unauthenticated access to public pages
        const publicRoutes = ["/", "/login", "/signup", "/terms", "/api/auth"];

        if (publicRoutes.some((route) => pathname.startsWith(route))) {
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
    // Apply to all routes except static files
    "/((?!_next/static|_next/image|favicon.ico|public/).*)",
  ],
};
