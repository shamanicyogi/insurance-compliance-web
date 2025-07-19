// 🔒 SECURITY: Authorization utilities to prevent unauthorized data access

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { SECURE_ERROR_MESSAGES } from "./secure-response";

/**
 * Get authenticated user or throw authorization error
 */
export async function getAuthenticatedUser() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    throw new AuthorizationError(SECURE_ERROR_MESSAGES.UNAUTHORIZED, 401);
  }

  return {
    userId: session.user.id,
    email: session.user.email,
    session,
  };
}

/**
 * Verify user owns a resource by checking the user_id field
 */
export async function verifyResourceOwnership(
  tableName: string,
  resourceId: string,
  userId: string,
  userIdColumn: string = "user_id"
) {
  const { data, error } = await supabase
    .from(tableName)
    .select(userIdColumn)
    .eq("id", resourceId)
    .single();

  if (error) {
    throw new AuthorizationError(SECURE_ERROR_MESSAGES.NOT_FOUND, 404);
  }

  if (
    !data ||
    (data as unknown as Record<string, string>)[userIdColumn] !== userId
  ) {
    throw new AuthorizationError(SECURE_ERROR_MESSAGES.FORBIDDEN, 403);
  }

  return true;
}

/**
 * Verify user owns multiple resources
 */
export async function verifyMultipleResourceOwnership(
  tableName: string,
  resourceIds: string[],
  userId: string,
  userIdColumn: string = "user_id"
) {
  const { data, error } = await supabase
    .from(tableName)
    .select(`id, ${userIdColumn}`)
    .in("id", resourceIds);

  if (error) {
    throw new AuthorizationError(SECURE_ERROR_MESSAGES.DATABASE_ERROR, 500);
  }

  // Check all resources exist and belong to user
  if (!data || data.length !== resourceIds.length) {
    throw new AuthorizationError(SECURE_ERROR_MESSAGES.NOT_FOUND, 404);
  }

  const unauthorizedResources = data.filter(
    (item) =>
      (item as unknown as Record<string, string>)[userIdColumn] !== userId
  );
  if (unauthorizedResources.length > 0) {
    throw new AuthorizationError(SECURE_ERROR_MESSAGES.FORBIDDEN, 403);
  }

  return true;
}

/**
 * Ensure user can only access their own data in API endpoints
 */
export async function enforceUserContext(requestedUserId?: string) {
  const { userId } = await getAuthenticatedUser();

  // If a specific user ID is requested, ensure it matches the authenticated user
  if (requestedUserId && requestedUserId !== userId) {
    throw new AuthorizationError(SECURE_ERROR_MESSAGES.FORBIDDEN, 403);
  }

  return userId;
}

/**
 * Check if user has admin privileges
 */
export async function requireAdminUser() {
  const { userId } = await getAuthenticatedUser();

  const { data, error } = await supabase
    .from("users")
    .select("role")
    .eq("id", userId)
    .single();

  if (error || data?.role !== "admin") {
    throw new AuthorizationError(SECURE_ERROR_MESSAGES.FORBIDDEN, 403);
  }

  return userId;
}

/**
 * Validate UUID format to prevent injection attacks
 */
export function validateUUID(id: string, fieldName: string = "id"): string {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  if (!uuidRegex.test(id)) {
    throw new AuthorizationError(`Invalid ${fieldName} format`, 400);
  }

  return id;
}

/**
 * Custom authorization error class
 */
export class AuthorizationError extends Error {
  public statusCode: number;

  constructor(message: string, statusCode: number = 403) {
    super(message);
    this.name = "AuthorizationError";
    this.statusCode = statusCode;
  }
}

/**
 * Middleware to add user context to Supabase queries
 * Automatically filters queries by user_id
 */
export function withUserContext(userId: string) {
  return {
    from: (tableName: string) => {
      return supabase.from(tableName).select("*").eq("user_id", userId);
    },
  };
}

/**
 * Safe query builder that automatically adds user context
 */
export async function createUserScopedQuery(
  tableName: string,
  columns: string = "*"
) {
  const { userId } = await getAuthenticatedUser();

  return supabase.from(tableName).select(columns).eq("user_id", userId);
}

/**
 * Higher-order function to add authorization to API handlers
 */
export function withAuthorization(
  handler: (request: Request, context?: { userId: string }) => Promise<Response>
) {
  return async (request: Request, context?: unknown): Promise<Response> => {
    try {
      const { userId } = await getAuthenticatedUser();

      return await handler(request, { ...(context as object), userId });
    } catch (error) {
      if (error instanceof AuthorizationError) {
        return Response.json(
          { error: error.message },
          { status: error.statusCode }
        );
      }
      throw error; // Re-throw non-authorization errors
    }
  };
}
