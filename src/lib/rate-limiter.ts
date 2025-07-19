// 🔒 SECURITY: Rate limiting utility to prevent API abuse
import { NextRequest } from "next/server";

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
  keyGenerator?: (req: NextRequest) => string; // Custom key generator
}

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

// In-memory store for rate limiting (use Redis in production)
const store: RateLimitStore = {};

// Clean up expired entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  Object.keys(store).forEach((key) => {
    if (store[key].resetTime < now) {
      delete store[key];
    }
  });
}, 5 * 60 * 1000);

/**
 * Rate limiting function
 * @param request - The incoming request
 * @param config - Rate limit configuration
 * @returns Object indicating if request is allowed and remaining count
 */
export function rateLimit(request: NextRequest, config: RateLimitConfig) {
  const now = Date.now();
  const key = config.keyGenerator
    ? config.keyGenerator(request)
    : getClientIP(request) || "anonymous";

  // Get or create rate limit entry
  let entry = store[key];

  if (!entry || entry.resetTime < now) {
    // Create new entry or reset expired one
    entry = {
      count: 0,
      resetTime: now + config.windowMs,
    };
    store[key] = entry;
  }

  // Increment counter
  entry.count++;

  // Check if limit exceeded
  const isAllowed = entry.count <= config.maxRequests;
  const remaining = Math.max(0, config.maxRequests - entry.count);
  const resetTime = entry.resetTime;

  return {
    isAllowed,
    remaining,
    resetTime,
    totalHits: entry.count,
  };
}

/**
 * Get client IP address from request
 */
function getClientIP(request: NextRequest): string | null {
  // Check various headers for IP (Vercel, Cloudflare, etc.)
  const forwardedFor = request.headers.get("x-forwarded-for");
  const realIP = request.headers.get("x-real-ip");
  const cfConnectingIP = request.headers.get("cf-connecting-ip");

  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }

  if (realIP) {
    return realIP;
  }

  if (cfConnectingIP) {
    return cfConnectingIP;
  }

  return null;
}

/**
 * Create rate limit response
 */
export function createRateLimitResponse(resetTime: number) {
  const headers = new Headers();
  headers.set("X-RateLimit-Limit", "10");
  headers.set("X-RateLimit-Remaining", "0");
  headers.set("X-RateLimit-Reset", Math.ceil(resetTime / 1000).toString());
  headers.set(
    "Retry-After",
    Math.ceil((resetTime - Date.now()) / 1000).toString()
  );

  return new Response(
    JSON.stringify({
      error: "Too many requests. Please try again later.",
      retryAfter: Math.ceil((resetTime - Date.now()) / 1000),
    }),
    {
      status: 429,
      headers,
    }
  );
}

// Predefined rate limit configurations
export const RATE_LIMITS = {
  // General API endpoints
  GENERAL: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100, // 100 requests per 15 minutes
  },

  // Authentication endpoints (more strict)
  AUTH: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5, // 5 login attempts per 15 minutes
  },

  // AI/ML endpoints (very strict due to cost)
  AI: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 10, // 10 AI requests per hour
  },

  // File upload (strict)
  UPLOAD: {
    windowMs: 5 * 60 * 1000, // 5 minutes
    maxRequests: 20, // 20 uploads per 5 minutes
  },

  // Data modification (moderate)
  MUTATION: {
    windowMs: 5 * 60 * 1000, // 5 minutes
    maxRequests: 50, // 50 mutations per 5 minutes
  },
} as const;

/**
 * Higher-order function to apply rate limiting to API handlers
 */
export function withRateLimit(
  config: RateLimitConfig,
  handler: (request: Request, context?: unknown) => Promise<Response>
) {
  return async (request: Request, context?: unknown): Promise<Response> => {
    // Convert Request to NextRequest for rate limiting
    const nextRequest = request as NextRequest;
    const limitResult = rateLimit(nextRequest, config);

    if (!limitResult.isAllowed) {
      return createRateLimitResponse(limitResult.resetTime);
    }

    const response = await handler(request, context);

    // Add rate limit headers to successful responses
    response.headers.set("X-RateLimit-Limit", config.maxRequests.toString());
    response.headers.set(
      "X-RateLimit-Remaining",
      limitResult.remaining.toString()
    );
    response.headers.set(
      "X-RateLimit-Reset",
      Math.ceil(limitResult.resetTime / 1000).toString()
    );

    return response;
  };
}
