/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { secureError } from "@/lib/utils/secure-logger";
import { supabase } from "@/lib/supabase";

/**
 * POST /api/external/ram-tracking/webhooks
 * Webhook endpoint to receive events from RAM Tracking
 *
 * This endpoint receives vehicle tracking events like:
 * - Vehicle arrivals/departures
 * - Speed limit violations
 * - Maintenance alerts
 * - Job completion updates
 */
export async function POST(request: NextRequest) {
  try {
    // Optional webhook secret validation (RAM Tracking may not provide secrets)
    const webhookSecret = process.env.RAM_TRACKING_WEBHOOK_SECRET;

    if (webhookSecret) {
      // If a secret is configured, validate it
      const headersList = await headers();
      const signature =
        headersList.get("x-ram-signature") ||
        headersList.get("x-signature") ||
        headersList.get("authorization");

      const providedSecret =
        headersList.get("auth") || // RAM Tracking uses "Auth" header
        headersList.get("x-ram-secret") ||
        headersList.get("x-webhook-secret");

      // Basic security check - either signature or secret must match
      if (
        providedSecret !== webhookSecret &&
        !signature?.includes(webhookSecret)
      ) {
        secureError(
          "Invalid webhook signature/secret for RAM Tracking webhook"
        );
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    } else {
      // No secret configured - webhook will accept all requests
      console.log(
        "RAM Tracking webhook: No secret configured, accepting all requests"
      );
    }

    // Parse the webhook payload
    const payload = await request.json();

    // Validate required fields
    if (!payload || typeof payload !== "object") {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    // Cast payload to the correct type
    const ramPayload = payload as RamTrackingWebhookPayload;

    // Log the webhook for debugging (remove in production if sensitive)
    console.log("RAM Tracking webhook received:", {
      event_type: ramPayload.vehicleEvent,
      vehicle_id: ramPayload.vehicleId,
      timestamp: ramPayload.dateTime,
    });

    // Store the webhook event in the database
    const webhookData = {
      source: "ram_tracking",
      event_type: ramPayload.vehicleEvent || "unknown",
      vehicle_id: ramPayload.vehicleId?.toString(),
      location: ramPayload.location,
      latitude: ramPayload.latitude,
      longitude: ramPayload.longitude,
      speed: ramPayload.speedMph,
      timestamp: ramPayload.dateTime || new Date().toISOString(),
      raw_payload: payload,
      processed: false,
      created_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("webhook_events")
      .insert(webhookData)
      .select()
      .single();

    if (error) {
      secureError("Error storing RAM Tracking webhook:", error);
      return NextResponse.json(
        { error: "Failed to store webhook" },
        { status: 500 }
      );
    }

    // Process the webhook based on event type
    await processWebhookEvent(ramPayload, data.id);

    // Return success response
    return NextResponse.json({
      success: true,
      message: "Webhook received and processed",
      event_id: data.id,
    });
  } catch (error) {
    secureError("Error processing RAM Tracking webhook:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Define types for RAM Tracking webhook payloads based on their documentation
interface RamTrackingWebhookPayload {
  accountId: number;
  vehicleRegistration: string;
  vehicleId: number;
  vehicleEvent: string; // "DRIVING", "STOPPED", etc.
  driverName: string;
  dateTime: string; // "2023-01-10 11:56:09"
  location: string;
  latitude: number;
  longitude: number;
  speedKph: number;
  speedMph: number;
  geofenceName: string | null;
  congestionZone: string | null;
  externalVoltage: number;
  internalVoltage: number | null;
  odometer: number;
}

/**
 * Process different types of webhook events
 */
async function processWebhookEvent(
  payload: RamTrackingWebhookPayload,
  eventId: string
) {
  try {
    const eventType = payload.vehicleEvent;

    switch (eventType) {
      case "ARRIVED":
      case "STOPPED":
        await handleVehicleArrival(payload, eventId);
        break;

      case "DRIVING":
      case "DEPARTED":
        await handleVehicleDeparture(payload, eventId);
        break;

      case "SPEEDING":
        await handleSpeedViolation(payload, eventId);
        break;

      case "MAINTENANCE":
        await handleMaintenanceAlert(payload, eventId);
        break;

      case "JOB_COMPLETED":
        await handleJobCompletion(payload, eventId);
        break;

      default:
        console.log(`Unknown RAM Tracking event type: ${eventType}`);
        break;
    }

    // Mark the webhook as processed
    await supabase
      .from("webhook_events")
      .update({ processed: true, processed_at: new Date().toISOString() })
      .eq("id", eventId);
  } catch (error) {
    secureError("Error processing webhook event:", error);
    // Don't throw - we still want to acknowledge receipt
  }
}

/**
 * Handle vehicle arrival events
 */
async function handleVehicleArrival(
  payload: RamTrackingWebhookPayload,
  _eventId: string
) {
  console.log(
    `Vehicle ${payload.vehicleRegistration} (${payload.vehicleId}) arrived at ${payload.location}`
  );
  console.log(`Driver: ${payload.driverName}, Speed: ${payload.speedMph} mph`);

  // Example: Update delivery status, send notifications, etc.
  // You can expand this based on your business logic

  // Could send arrival notification email or SMS
  console.log(
    `Vehicle arrived at coordinates: ${payload.latitude}, ${payload.longitude}`
  );
}

/**
 * Handle vehicle departure events
 */
async function handleVehicleDeparture(
  payload: RamTrackingWebhookPayload,
  _eventId: string
) {
  console.log(
    `Vehicle ${payload.vehicleRegistration} (${payload.vehicleId}) is now driving from ${payload.location}`
  );
  console.log(`Driver: ${payload.driverName}, Speed: ${payload.speedMph} mph`);

  // Example: Update route status, log travel times, etc.
}

/**
 * Handle speed violation events
 */
async function handleSpeedViolation(
  payload: RamTrackingWebhookPayload,
  _eventId: string
) {
  console.log(
    `Speed alert: Vehicle ${payload.vehicleRegistration} is traveling at ${payload.speedMph} mph (${payload.speedKph} kph)`
  );
  console.log(`Driver: ${payload.driverName}, Location: ${payload.location}`);

  // Example: Send alerts to fleet managers, log violations, etc.
  // Could integrate with your Slack/Teams notifications
}

/**
 * Handle maintenance alerts
 */
async function handleMaintenanceAlert(
  payload: RamTrackingWebhookPayload,
  _eventId: string
) {
  console.log(`Maintenance alert for vehicle ${payload.vehicleRegistration}`);
  console.log(
    `Odometer: ${payload.odometer}, Voltage: ${payload.externalVoltage}V`
  );

  // Example: Create calendar events, update maintenance schedules, etc.
}

/**
 * Handle job completion events
 */
async function handleJobCompletion(
  payload: RamTrackingWebhookPayload,
  _eventId: string
) {
  console.log(
    `Job completed by vehicle ${payload.vehicleRegistration} at ${payload.location}`
  );
  console.log(
    `Driver: ${payload.driverName}, Final odometer: ${payload.odometer}`
  );

  // Example: Update CRM, send completion emails, update billing, etc.
}

/**
 * GET method for webhook verification (some services send GET requests to verify endpoints)
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const challenge = searchParams.get("challenge");

  if (challenge) {
    // Echo back the challenge for webhook verification
    return NextResponse.json({ challenge });
  }

  return NextResponse.json({
    message: "RAM Tracking webhook endpoint is active",
    timestamp: new Date().toISOString(),
  });
}
