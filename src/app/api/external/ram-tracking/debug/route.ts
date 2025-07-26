import { NextResponse } from "next/server";

/**
 * Temporary debug endpoint to check webhook secret configuration
 * DELETE THIS FILE after debugging!
 */
export async function GET() {
  const webhookSecret = process.env.RAM_TRACKING_WEBHOOK_SECRET;

  return NextResponse.json({
    secretConfigured: !!webhookSecret,
    secretLength: webhookSecret ? webhookSecret.length : 0,
    // DON'T expose the actual secret - just first/last chars for verification
    secretPreview: webhookSecret
      ? `${webhookSecret.substring(0, 4)}...${webhookSecret.substring(webhookSecret.length - 4)}`
      : "Not set",
    environment: process.env.NODE_ENV,
  });
}
