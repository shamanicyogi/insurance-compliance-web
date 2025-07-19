// 🔒 SECURITY: Secure logging utility to prevent sensitive data exposure

/**
 * Safe console.log that only logs in development
 * Use this instead of console.log to prevent production data leakage
 */
export function secureLog(message: string, data?: unknown) {
  if (process.env.NODE_ENV === "development") {
    if (data !== undefined) {
      console.log(message, data);
    } else {
      console.log(message);
    }
  }
}

/**
 * Safe console.error that sanitizes error data in production
 * Logs full error in development, generic message in production
 */
export function secureError(message: string, error?: unknown) {
  if (process.env.NODE_ENV === "development") {
    console.error(message, error);
  } else {
    // In production, only log generic error message without sensitive details
    console.error(message);
  }
}

/**
 * Safe console.warn that only shows warnings in development
 */
export function secureWarn(message: string, data?: unknown) {
  if (process.env.NODE_ENV === "development") {
    if (data !== undefined) {
      console.warn(message, data);
    } else {
      console.warn(message);
    }
  }
}

/**
 * Sanitize sensitive data for logging
 * Removes or masks sensitive fields from objects
 */
export function sanitizeForLogging(data: unknown): unknown {
  if (typeof data !== "object" || data === null) {
    return data;
  }

  const sensitiveFields = [
    "password",
    "token",
    "secret",
    "key",
    "authorization",
    "auth",
    "session",
    "cookie",
    "email",
    "phone",
    "ssn",
    "credit",
    "card",
  ];

  if (Array.isArray(data)) {
    return data.map((item) => sanitizeForLogging(item));
  }

  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    const lowercaseKey = key.toLowerCase();
    const isSensitive = sensitiveFields.some((field) =>
      lowercaseKey.includes(field)
    );

    if (isSensitive) {
      sanitized[key] = "[REDACTED]";
    } else if (typeof value === "object" && value !== null) {
      sanitized[key] = sanitizeForLogging(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Log data safely with automatic sanitization
 */
export function secureLogSanitized(message: string, data: unknown) {
  secureLog(message, sanitizeForLogging(data));
}
