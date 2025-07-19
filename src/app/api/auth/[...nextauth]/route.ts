import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";
import { withErrorHandling } from "@/lib/api-error-handler";

const handler = NextAuth(authOptions);

// Wrap the NextAuth handlers with error handling
const GET = withErrorHandling(handler);
const POST = withErrorHandling(handler);

export { GET, POST };
