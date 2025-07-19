import { NextRequest } from "next/server";
import * as Sentry from "@sentry/nextjs";
import {
  createSecureErrorResponse,
  SECURE_ERROR_MESSAGES,
} from "./secure-response";
import { secureError } from "./utils/secure-logger";

type ApiHandler = (req: NextRequest, context?: unknown) => Promise<Response>;

export function withErrorHandling(handler: ApiHandler): ApiHandler {
  return async (req: NextRequest, context?: unknown) => {
    try {
      return await handler(req, context);
    } catch (error) {
      // 🔒 SECURE: Use secure logging instead of console.error
      secureError("API Error:", error);

      // 🔒 SECURE: Sanitize Sentry context to avoid leaking sensitive data
      Sentry.withScope((scope) => {
        scope.setTag("api_route", req.url);
        scope.setTag("method", req.method);
        scope.setLevel("error");

        // 🔒 SECURE: Filter sensitive headers
        const safeHeaders = Object.fromEntries(req.headers.entries());

        // Remove sensitive headers from Sentry
        delete safeHeaders["authorization"];
        delete safeHeaders["cookie"];
        delete safeHeaders["x-api-key"];

        scope.setContext("request", {
          url: req.url,
          method: req.method,
          headers: safeHeaders,
        });

        Sentry.captureException(error);
      });

      // 🔒 SECURE: Use secure error response that prevents information disclosure
      return createSecureErrorResponse(
        error,
        SECURE_ERROR_MESSAGES.SERVER_ERROR,
        500
      );
    }
  };
}
