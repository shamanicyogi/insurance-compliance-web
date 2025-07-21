import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function middleware(_request: NextRequest) {
  // Empty middleware - allows all requests to pass through
  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match all paths except static files
    // "/((?!_next/static|_next/image|favicon.ico|public).*)",
  ],
};
