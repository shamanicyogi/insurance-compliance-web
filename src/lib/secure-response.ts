// 🔒 SECURITY: Secure response utility to prevent information disclosure

import { NextResponse } from "next/server";

/**
 * Secure error response that prevents information disclosure
 */
export function createSecureErrorResponse(
  error: unknown,
  fallbackMessage: string = "Internal server error",
  statusCode: number = 500
) {
  // In development, include more details for debugging
  if (process.env.NODE_ENV === "development") {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : fallbackMessage,
        details: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString(),
      },
      { status: statusCode }
    );
  }

  // In production, sanitize error responses
  const sanitizedMessage = sanitizeErrorMessage(error, fallbackMessage);

  return NextResponse.json(
    {
      error: sanitizedMessage,
      timestamp: new Date().toISOString(),
    },
    { status: statusCode }
  );
}

/**
 * Sanitize error messages to prevent information disclosure
 */
function sanitizeErrorMessage(error: unknown, fallback: string): string {
  if (!(error instanceof Error)) {
    return fallback;
  }

  const message = error.message.toLowerCase();

  // Database-related errors - don't expose internal details
  if (
    message.includes("database") ||
    message.includes("connection") ||
    message.includes("timeout") ||
    message.includes("constraint") ||
    message.includes("relation") ||
    message.includes("column") ||
    message.includes("table") ||
    message.includes("postgres") ||
    message.includes("supabase") ||
    message.includes("sql")
  ) {
    return "Database operation failed";
  }

  // File system errors
  if (
    message.includes("enoent") ||
    message.includes("eacces") ||
    message.includes("file not found") ||
    message.includes("permission denied")
  ) {
    return "File operation failed";
  }

  // Network/API errors
  if (
    message.includes("network") ||
    message.includes("fetch failed") ||
    message.includes("connection refused") ||
    message.includes("timeout")
  ) {
    return "Network operation failed";
  }

  // Authentication/API key errors
  if (
    message.includes("api key") ||
    message.includes("unauthorized") ||
    message.includes("forbidden") ||
    message.includes("access denied")
  ) {
    return "Authentication failed";
  }

  // Generic safe error messages for common issues
  if (message.includes("validation") || message.includes("invalid")) {
    return "Invalid request data";
  }

  if (message.includes("not found")) {
    return "Resource not found";
  }

  // If none of the above, return the fallback
  return fallback;
}

/**
 * Create success response with consistent format
 */
export function createSuccessResponse<T>(
  data: T,
  message?: string,
  statusCode: number = 200
) {
  return NextResponse.json(
    {
      success: true,
      data,
      message,
      timestamp: new Date().toISOString(),
    },
    { status: statusCode }
  );
}

/**
 * Create validation error response
 */
export function createValidationErrorResponse(
  errors: Array<{ field: string; message: string }>,
  statusCode: number = 400
) {
  return NextResponse.json(
    {
      error: "Validation failed",
      details: errors,
      timestamp: new Date().toISOString(),
    },
    { status: statusCode }
  );
}

/**
 * Standard error messages to prevent information disclosure
 */
export const SECURE_ERROR_MESSAGES = {
  UNAUTHORIZED: "Authentication required",
  FORBIDDEN: "Access denied",
  NOT_FOUND: "Resource not found",
  INVALID_INPUT: "Invalid request data",
  RATE_LIMITED: "Too many requests",
  SERVER_ERROR: "Internal server error",
  SERVICE_UNAVAILABLE: "Service temporarily unavailable",
  DATABASE_ERROR: "Database operation failed",
  NETWORK_ERROR: "Network operation failed",
  FILE_ERROR: "File operation failed",
} as const;
